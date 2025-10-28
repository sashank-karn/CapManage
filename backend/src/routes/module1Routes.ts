import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { listModule1Requirements, listFacultyApprovalQueue } from '../controllers/module1Controller';

const router = Router();

router.use(authenticate);

router.get('/requirements', listModule1Requirements);
router.get('/faculty/queue', ...listFacultyApprovalQueue);

export default router;
