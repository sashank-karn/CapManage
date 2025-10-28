import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule4Requirements, facultyDashboardPreview } from '../controllers/module4Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', authorize(['faculty', 'admin']), listModule4Requirements);
router.get('/dashboard-preview', authorize(['faculty', 'admin']), facultyDashboardPreview);

export default router;
