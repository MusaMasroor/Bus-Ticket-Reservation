import { Router } from 'express';
import {
  createBookingHandler,
  getMyBookings,
  cancelBooking,
} from '../controllers/bookingController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// All user booking routes require auth
router.post('/',             authMiddleware, createBookingHandler);
router.get('/my',            authMiddleware, getMyBookings);
router.put('/:id/cancel',    authMiddleware, cancelBooking);

export default router;
