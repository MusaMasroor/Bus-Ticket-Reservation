import { Router } from 'express';
import { getAllBookings, getStats } from '../controllers/bookingController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);

// GET /api/admin/bookings
router.get('/bookings', getAllBookings);

// GET /api/admin/stats
router.get('/stats', getStats);

export default router;
