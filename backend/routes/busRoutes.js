import { Router } from 'express';
import { getBuses, createBusHandler, updateBusHandler, deleteBus } from '../controllers/busController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = Router();

// All bus admin routes require auth + admin
router.use(authMiddleware, adminMiddleware);

router.get('/',     getBuses);
router.post('/',    createBusHandler);
router.put('/:id',  updateBusHandler);
router.delete('/:id', deleteBus);

export default router;
