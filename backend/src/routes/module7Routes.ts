import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule7Requirements, notificationPreview } from '../controllers/module7Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', authorize(['student', 'faculty', 'admin']), listModule7Requirements);
router.get('/notifications-preview', authorize(['student', 'faculty', 'admin']), notificationPreview);

export default router;
