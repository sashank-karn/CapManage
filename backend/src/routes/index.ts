import { Router } from 'express';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import studentRoutes from './studentRoutes';
import facultyRoutes from './facultyRoutes';
import projectRoutes from './projectRoutes';
import messageRoutes from './messageRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/student', studentRoutes);
router.use('/faculty', facultyRoutes);
router.use('/projects', projectRoutes);
router.use('/messages', messageRoutes);

export default router;
