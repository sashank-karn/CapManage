import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule9Requirements, documentVaultPreview } from '../controllers/module9Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', authorize(['student', 'faculty', 'admin']), listModule9Requirements);
router.get('/vault-preview', authorize(['student', 'faculty', 'admin']), documentVaultPreview);

export default router;
