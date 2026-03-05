import { Router } from 'express';
import { getSeatLayout, lockSeatsHandler } from '../controllers/seatController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// GET  /api/routes/:id/seats  — public (optionalAuth to identify user's own locks)
router.get('/:id/seats', optionalAuth, getSeatLayout);

// POST /api/routes/:id/seats/lock — requires auth
router.post('/:id/seats/lock', authMiddleware, lockSeatsHandler);

export default router;
