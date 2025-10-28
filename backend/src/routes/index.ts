import { Router } from 'express';
import authRoutes from './authRoutes';
import module1Routes from './module1Routes';
import module2Routes from './module2Routes';
import module3Routes from './module3Routes';
import module4Routes from './module4Routes';
import module5Routes from './module5Routes';
import module6Routes from './module6Routes';
import module7Routes from './module7Routes';
import module8Routes from './module8Routes';
import module9Routes from './module9Routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/module1', module1Routes);
router.use('/module2', module2Routes);
router.use('/module-3', module3Routes);
router.use('/module-4', module4Routes);
router.use('/module-5', module5Routes);
router.use('/module-6', module6Routes);
router.use('/module-7', module7Routes);
router.use('/module-8', module8Routes);
router.use('/module9', module9Routes);

export default router;
