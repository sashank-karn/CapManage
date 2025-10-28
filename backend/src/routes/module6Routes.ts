import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule6Requirements, evaluationToolsPreview } from '../controllers/module6Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', authorize(['faculty', 'admin']), listModule6Requirements);
router.get('/evaluation-preview', authorize(['faculty', 'admin']), evaluationToolsPreview);

export default router;
