import { body } from 'express-validator';
import mongoose from 'mongoose';
import Route from '../models/Route.js';
import Booking from '../models/Booking.js';
import SeatLock from '../models/SeatLock.js';
import { getSeatPrice } from '../utils/seatPricing.js';
import validate from '../middleware/validationMiddleware.js';

// ── GET /api/routes/:id/seats ─────────────────────────────────────────────────

export const getSeatLayout = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('busId', 'name busNumber type seatLayout')
      .lean();

    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    if (route.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This route has been cancelled.' });
    }

    // Auto-expire stale locks by deleting them (TTL index handles it eventually; this ensures fresh data)
    await SeatLock.deleteMany({ routeId: route._id, lockedUntil: { $lt: new Date() } });

    // Get all confirmed booked seat numbers for this route
    const bookings = await Booking.find({ routeId: route._id, status: 'confirmed' }).lean();
    const bookedSeats = new Set(bookings.flatMap((b) => b.seatNumbers));

    // Get all active locks for this route
    const locks = await SeatLock.find({ routeId: route._id }).lean();
    const lockMap = {};
    locks.forEach((l) => { lockMap[l.seatNumber] = l; });

    const currentUserId = req.user?._id?.toString();

    // Build enriched seat list
    const seats = route.busId.seatLayout.seats.map((seat) => {
      const price = getSeatPrice(route.basePrice, seat.type);
      let status = 'available';

      if (bookedSeats.has(seat.seatNumber)) {
        status = 'booked';
      } else if (lockMap[seat.seatNumber]) {
        const lock = lockMap[seat.seatNumber];
        status = currentUserId && lock.lockedBy.toString() === currentUserId ? 'selected' : 'locked';
      }

      return { ...seat, status, price };
    });

    res.json({
      success: true,
      data: {
        route: {
          _id: route._id,
          source: route.source,
          destination: route.destination,
          departureTime: route.departureTime,
          arrivalTime: route.arrivalTime,
          date: route.date,
          basePrice: route.basePrice,
          bus: route.busId,
        },
        seats,
        layout: {
          rows: route.busId.seatLayout.rows,
          cols: route.busId.seatLayout.cols,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/routes/:id/seats/lock ──────────────────────────────────────────

export const lockRules = [
  body('seatNumbers').isArray({ min: 1 }).withMessage('At least one seat number is required'),
  body('seatNumbers.*').isString().notEmpty().withMessage('Invalid seat number'),
];

export const lockSeats = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { seatNumbers } = req.body;
    const routeId = req.params.id;
    const userId = req.user._id;

    // Read-only validations (outside transaction)
    const route = await Route.findById(routeId).populate('busId', 'seatLayout').lean();
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    if (route.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This route has been cancelled.' });
    }

    // Block locking seats on departed routes
    if (new Date(route.departureTime) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot lock seats on a route that has already departed.' });
    }

    const validSeatNumbers = new Set(route.busId.seatLayout.seats.map((s) => s.seatNumber));
    const invalidSeats = seatNumbers.filter((s) => !validSeatNumbers.has(s));
    if (invalidSeats.length > 0) {
      return res.status(400).json({ success: false, message: `Invalid seats: ${invalidSeats.join(', ')}` });
    }

    // ── Begin atomic transaction for lock check + lock creation ──
    session.startTransaction();

    // Check no requested seat is already confirmed-booked
    const existingBooking = await Booking.findOne({
      routeId,
      seatNumbers: { $in: seatNumbers },
      status: 'confirmed',
    }).session(session);
    if (existingBooking) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'One or more seats are already booked.' });
    }

    // Auto-expire stale locks
    await SeatLock.deleteMany({ routeId, lockedUntil: { $lt: new Date() } }).session(session);

    // Check no requested seat is locked by another user
    const othersLocks = await SeatLock.find({
      routeId,
      seatNumber: { $in: seatNumbers },
      lockedBy: { $ne: userId },
    }).session(session);
    if (othersLocks.length > 0) {
      await session.abortTransaction();
      const takenSeats = othersLocks.map((l) => l.seatNumber).join(', ');
      return res.status(409).json({
        success: false,
        message: `Seats currently locked by another user: ${takenSeats}. Please choose different seats.`,
      });
    }

    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clear old locks for this user on this route, then create new ones
    await SeatLock.deleteMany({ routeId, lockedBy: userId }).session(session);
    await SeatLock.insertMany(
      seatNumbers.map((seatNumber) => ({ routeId, seatNumber, lockedBy: userId, lockedUntil })),
      { session }
    );

    await session.commitTransaction();

    res.json({
      success: true,
      message: `${seatNumbers.length} seat(s) locked for 10 minutes.`,
      data: { lockedUntil, seatNumbers },
    });
  } catch (err) {
    if (session.inTransaction()) await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

export const lockSeatsHandler = [...lockRules, validate, lockSeats];
