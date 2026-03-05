import { Router } from 'express';
import {
  getAdminRoutes,
  createRouteHandler,
  updateRouteHandler,
  deleteRoute,
  searchRoutes,
} from '../controllers/routeController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = Router();

// Public search — GET /api/search (mounted at /api)
router.get('/search', searchRoutes);

// Admin CRUD — mounted at /api/admin/routes
router.get('/',       authMiddleware, adminMiddleware, getAdminRoutes);
router.post('/',      authMiddleware, adminMiddleware, createRouteHandler);
router.put('/:id',    authMiddleware, adminMiddleware, updateRouteHandler);
router.delete('/:id', authMiddleware, adminMiddleware, deleteRoute);

export default router;
