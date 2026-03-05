import { Router } from 'express';
import { registerHandler, loginHandler, getMe } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

router.post('/register', registerHandler);
router.post('/login',    loginHandler);
router.get('/me',        authMiddleware, getMe);

export default router;
