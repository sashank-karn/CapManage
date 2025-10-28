import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { listModule3Requirements, adminUserManagementSummary } from '../controllers/module3Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', authorize(['admin']), listModule3Requirements);
router.get('/summary', authorize(['admin']), adminUserManagementSummary);

export default router;
