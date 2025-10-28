import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule5Requirements, submissionWorkflowPreview } from '../controllers/module5Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', authorize(['student', 'faculty', 'admin']), listModule5Requirements);
router.get('/workflow-preview', authorize(['student', 'faculty']), submissionWorkflowPreview);

export default router;
