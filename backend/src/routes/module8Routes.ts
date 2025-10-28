import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule8Requirements, reportsPreview } from '../controllers/module8Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', authorize(['student', 'faculty', 'admin']), listModule8Requirements);
router.get('/reports-preview', authorize(['faculty', 'admin']), reportsPreview);

export default router;
