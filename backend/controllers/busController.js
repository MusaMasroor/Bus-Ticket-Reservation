import { body } from 'express-validator';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import validate from '../middleware/validationMiddleware.js';

// ── Validation Rules ──────────────────────────────────────────────────────────

export const busRules = [
  body('name').trim().notEmpty().withMessage('Bus name is required'),
  body('busNumber').trim().notEmpty().withMessage('Bus number is required'),
  body('type').isIn(['AC', 'Non-AC', 'Sleeper', 'Seater']).withMessage('Invalid bus type'),
  body('totalSeats').isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
  body('seatLayout').notEmpty().withMessage('Seat layout is required'),
  body('seatLayout.rows').isInt({ min: 1 }).withMessage('Seat layout rows required'),
  body('seatLayout.cols').isInt({ min: 1 }).withMessage('Seat layout cols required'),
  body('seatLayout.seats').isArray({ min: 1 }).withMessage('At least one seat definition required'),
];

// ── Controllers ───────────────────────────────────────────────────────────────

export const getBuses = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [buses, total] = await Promise.all([
      Bus.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Bus.countDocuments(),
    ]);

    res.json({
      success: true,
      data: buses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const createBus = async (req, res, next) => {
  try {
    // Validate totalSeats matches the actual seat layout count
    if (req.body.seatLayout?.seats && req.body.totalSeats !== req.body.seatLayout.seats.length) {
      return res.status(400).json({
        success: false,
        message: `totalSeats (${req.body.totalSeats}) does not match seat layout count (${req.body.seatLayout.seats.length}).`,
      });
    }

    const bus = await Bus.create(req.body);
    res.status(201).json({ success: true, data: bus });
  } catch (err) {
    next(err);
  }
};

export const updateBus = async (req, res, next) => {
  try {
    // Validate totalSeats matches the actual seat layout count
    if (req.body.seatLayout?.seats && req.body.totalSeats !== req.body.seatLayout.seats.length) {
      return res.status(400).json({
        success: false,
        message: `totalSeats (${req.body.totalSeats}) does not match seat layout count (${req.body.seatLayout.seats.length}).`,
      });
    }

    const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });
    res.json({ success: true, data: bus });
  } catch (err) {
    next(err);
  }
};

export const deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found.' });

    // Prevent deletion if active routes reference this bus
    const activeRouteCount = await Route.countDocuments({ busId: bus._id, status: 'active' });
    if (activeRouteCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete bus — ${activeRouteCount} active route(s) still reference it. Cancel or delete those routes first.`,
      });
    }

    await bus.deleteOne();
    res.json({ success: true, message: 'Bus deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// Validation + handler bundles
export const createBusHandler = [...busRules, validate, createBus];
export const updateBusHandler = [...busRules, validate, updateBus];
