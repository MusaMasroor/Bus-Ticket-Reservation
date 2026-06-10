import { body } from 'express-validator';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Route from '../models/Route.js';
import SeatLock from '../models/SeatLock.js';
import Bus from '../models/Bus.js';
import { getSeatPrice } from '../utils/seatPricing.js';
import validate from '../middleware/validationMiddleware.js';

// ── Validation ────────────────────────────────────────────────────────────────

export const bookingRules = [
  body('routeId').notEmpty().isMongoId().withMessage('Valid route ID is required'),
  body('seatNumbers').isArray({ min: 1 }).withMessage('At least one seat is required'),
  body('seatNumbers.*').isString().notEmpty().withMessage('Invalid seat number'),
];

// ── POST /api/bookings ────────────────────────────────────────────────────────

export const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { routeId, seatNumbers } = req.body;
    const userId = req.user._id;

    // 1. Validate route (outside transaction — read-only)
    const route = await Route.findById(routeId).populate('busId', 'seatLayout').lean();
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    if (route.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This route has been cancelled.' });
    }

    // 1b. Block booking if departure has already passed
    if (new Date(route.departureTime) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot book a route that has already departed.' });
    }

    // 2. Validate seat numbers exist in bus layout
    const validSeatNumbers = new Set(route.busId.seatLayout.seats.map((s) => s.seatNumber));
    const invalidSeats = seatNumbers.filter((s) => !validSeatNumbers.has(s));
    if (invalidSeats.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid seat numbers: ${invalidSeats.join(', ')}` });
    }

    // ── Begin atomic transaction for conflict check + booking creation ──
    session.startTransaction();

    // 3. Check no seat is already booked (within transaction)
    const conflictBooking = await Booking.findOne({
      routeId,
      seatNumbers: { $in: seatNumbers },
      status: 'confirmed',
    }).session(session);
    if (conflictBooking) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'One or more selected seats are already booked.' });
    }

    // 4. Verify user holds active locks for all requested seats
    const now = new Date();
    const userLocks = await SeatLock.find({
      routeId,
      lockedBy: userId,
      lockedUntil: { $gt: now },
    }).session(session).lean();
    const lockedSeatNumbers = new Set(userLocks.map((l) => l.seatNumber));
    const unlockedSeats = seatNumbers.filter((s) => !lockedSeatNumbers.has(s));
    if (unlockedSeats.length > 0) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'Your seat reservation has expired. Please go back and reselect seats.',
      });
    }

    // 5. Calculate total price
    const seatMap = {};
    route.busId.seatLayout.seats.forEach((s) => { seatMap[s.seatNumber] = s; });
    const totalAmount = seatNumbers.reduce(
      (sum, sn) => sum + getSeatPrice(route.basePrice, seatMap[sn]?.type || 'aisle'),
      0
    );

    // 6. Create booking with mock payment ID (within transaction)
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const [booking] = await Booking.create(
      [{ userId, routeId, seatNumbers, totalAmount, paymentId }],
      { session }
    );

    // 7. Release the seat locks (within transaction)
    await SeatLock.deleteMany(
      { routeId, lockedBy: userId, seatNumber: { $in: seatNumbers } }
    ).session(session);

    await session.commitTransaction();

    // 8. Populate and return (outside transaction)
    await booking.populate([
      { path: 'userId', select: 'name email' },
      { path: 'routeId', populate: { path: 'busId', select: 'name busNumber type' } },
    ]);

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ── GET /api/bookings/my ──────────────────────────────────────────────────────

export const getMyBookings = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (req.query.status) filter.status = req.query.status;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate({ path: 'routeId', populate: { path: 'busId', select: 'name busNumber type' } })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/bookings/:id/cancel ──────────────────────────────────────────────

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('routeId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Ownership check
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed bookings can be cancelled.' });
    }

    // Cannot cancel if departure has already passed
    if (new Date(booking.routeId.departureTime) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot cancel a booking after departure.' });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.json({ success: true, message: 'Booking cancelled successfully.', data: booking });
  } catch (err) {
    next(err);
  }
};

// ── Admin: GET /api/admin/bookings ────────────────────────────────────────────

export const getAllBookings = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.routeId && mongoose.isValidObjectId(req.query.routeId)) {
      filter.routeId = req.query.routeId;
    }
    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const endOfDay = new Date(req.query.dateTo);
        endOfDay.setUTCHours(23, 59, 59, 999);
        filter.createdAt.$lte = endOfDay;
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('userId', 'name email')
        .populate({ path: 'routeId', populate: { path: 'busId', select: 'name busNumber type' } })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── Admin: GET /api/admin/stats ───────────────────────────────────────────────

export const getStats = async (req, res, next) => {
  try {
    const today    = new Date(); today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setUTCDate(today.getUTCDate() + 1);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalBuses, totalRoutes, todayBookings, revenueResult, last7Days] = await Promise.all([
      Bus.countDocuments(),
      Route.countDocuments({ status: 'active' }),
      Booking.countDocuments({ status: 'confirmed', createdAt: { $gte: today, $lt: tomorrow } }),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Booking.aggregate([
        { $match: { status: 'confirmed', createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            bookings: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', bookings: 1, revenue: 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalBuses,
        totalRoutes,
        todayBookings,
        totalRevenue: revenueResult[0]?.total || 0,
        last7Days,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createBookingHandler = [...bookingRules, validate, createBooking];
