import { Router } from 'express';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { getRecommendations } from '../controllers/recommendationController.js';

const router = Router();

// GET /api/recommendations
// Public endpoint — returns popularity-based recommendations for anonymous users,
// personalized recommendations for authenticated users.
router.get('/', optionalAuth, getRecommendations);

export default router;
