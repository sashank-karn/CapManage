import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { listMessagesController, sendMessageController } from '../controllers/messageController';

const router = Router();

router.use(authenticate);

router.get('/', validateRequest(z.object({ query: z.object({ projectId: z.string().length(24).optional(), withUserId: z.string().length(24).optional(), limit: z.string().optional() }) })), listMessagesController);

router.post('/', validateRequest(z.object({ body: z.object({ text: z.string().min(1), projectId: z.string().length(24).optional(), recipientId: z.string().length(24).optional() }) })), sendMessageController);

// Removed call/email request endpoint

export default router;
