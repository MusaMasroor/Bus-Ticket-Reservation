import { body } from 'express-validator';
import Route from '../models/Route.js';
import Bus from '../models/Bus.js';
import Booking from '../models/Booking.js';
import validate from '../middleware/validationMiddleware.js';

// ── Validation Rules ──────────────────────────────────────────────────────────

export const routeRules = [
  body('busId').notEmpty().isMongoId().withMessage('Valid bus ID required'),
  body('source').trim().notEmpty().withMessage('Source city is required'),
  body('destination').trim().notEmpty().withMessage('Destination city is required'),
  body('basePrice').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('departureTime').notEmpty().withMessage('Departure time is required'),
  body('arrivalTime').notEmpty().withMessage('Arrival time is required'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
  body('totalSeats').isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
];

// ── Admin: CRUD ───────────────────────────────────────────────────────────────

export const getAdminRoutes = async (req, res, next) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 10);
    const skip   = (page - 1) * limit;

    const filter = {};
    if (req.query.source)      filter.source      = { $regex: new RegExp(req.query.source, 'i') };
    if (req.query.destination) filter.destination = { $regex: new RegExp(req.query.destination, 'i') };
    if (req.query.date)        filter.date        = req.query.date;
    if (req.query.status)      filter.status      = req.query.status;

    const [routes, total] = await Promise.all([
      Route.find(filter)
        .populate('busId', 'name busNumber type')
        .skip(skip)
        .limit(limit)
        .sort({ date: -1, departureTime: 1 })
        .lean(),
      Route.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: routes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const createRoute = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.body.busId);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });

    const route = await Route.create({
      ...req.body,
      totalSeats: req.body.totalSeats || bus.totalSeats,
    });
    await route.populate('busId', 'name busNumber type');

    res.status(201).json({ success: true, data: route });
  } catch (err) {
    next(err);
  }
};

export const updateRoute = async (req, res, next) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('busId', 'name busNumber type');

    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    res.json({ success: true, data: route });
  } catch (err) {
    next(err);
  }
};

export const deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: 'Route not found.' });
    res.json({ success: true, message: 'Route deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── Public: Search ────────────────────────────────────────────────────────────

export const searchRoutes = async (req, res, next) => {
  try {
    const { source, destination, date, type, minPrice, maxPrice, departureAfter, departureBefore, sort } = req.query;

    const filter = { status: 'active' };

    if (source)      filter.source      = { $regex: new RegExp(`^${source}$`, 'i') };
    if (destination) filter.destination = { $regex: new RegExp(`^${destination}$`, 'i') };
    if (date)        filter.date        = date;
    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = Number(minPrice);
      if (maxPrice) filter.basePrice.$lte = Number(maxPrice);
    }
    if (departureAfter || departureBefore) {
      filter.departureTime = {};
      if (departureAfter)  filter.departureTime.$gte = new Date(departureAfter);
      if (departureBefore) filter.departureTime.$lte = new Date(departureBefore);
    }

    // Filter by bus type (requires a sub-query)
    if (type) {
      const buses = await Bus.find({ type }).select('_id').lean();
      filter.busId = { $in: buses.map((b) => b._id) };
    }

    const sortMap = {
      price_asc:     { basePrice: 1 },
      price_desc:    { basePrice: -1 },
      departure_asc: { departureTime: 1 },
    };
    const sortOption = sortMap[sort] || { departureTime: 1 };

    const routes = await Route.find(filter)
      .populate('busId', 'name busNumber type totalSeats seatLayout')
      .sort(sortOption)
      .lean();

    // Enrich each route with available seat count
    if (routes.length > 0) {
      const routeIds = routes.map((r) => r._id);
      const bookingCounts = await Booking.aggregate([
        { $match: { routeId: { $in: routeIds }, status: 'confirmed' } },
        { $unwind: '$seatNumbers' },
        { $group: { _id: '$routeId', bookedCount: { $sum: 1 } } },
      ]);
      const bookedMap = {};
      bookingCounts.forEach((b) => { bookedMap[b._id.toString()] = b.bookedCount; });

      routes.forEach((r) => {
        r.bookedSeats    = bookedMap[r._id.toString()] || 0;
        r.availableSeats = r.totalSeats - r.bookedSeats;
      });
    }

    res.json({ success: true, data: routes, count: routes.length });
  } catch (err) {
    next(err);
  }
};

// Validation + handler bundles
export const createRouteHandler = [...routeRules, validate, createRoute];
export const updateRouteHandler = [...routeRules, validate, updateRoute];
