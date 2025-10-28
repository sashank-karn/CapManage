import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule2Requirements, getStudentDashboardPreview } from '../controllers/module2Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', listModule2Requirements);
router.get('/dashboard-preview', authorize(['student']), getStudentDashboardPreview);

export default router;
