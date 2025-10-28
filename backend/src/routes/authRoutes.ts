import { Router } from 'express';
import {
  registerStudentHandler,
  registerFacultyHandler,
  verifyEmailHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  requestPasswordResetHandler,
  resetPasswordHandler,
  listPendingFacultyRequestsHandler,
  updateFacultyRequestHandler
} from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';
import {
  registerStudentSchema,
  registerFacultySchema,
  loginSchema,
  verifyEmailSchema,
  refreshSchema,
  logoutSchema,
  requestResetSchema,
  resetPasswordSchema
} from '../validators/authValidators';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/register/student', validateRequest(registerStudentSchema), registerStudentHandler);
router.post('/register/faculty', validateRequest(registerFacultySchema), registerFacultyHandler);
router.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmailHandler);
router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/refresh', validateRequest(refreshSchema), refreshHandler);
router.post('/logout', validateRequest(logoutSchema), logoutHandler);
router.post('/password/request-reset', validateRequest(requestResetSchema), requestPasswordResetHandler);
router.post('/password/reset', validateRequest(resetPasswordSchema), resetPasswordHandler);

router.get('/faculty/requests', authenticate, ...listPendingFacultyRequestsHandler);
router.patch('/faculty/requests/:id', authenticate, ...updateFacultyRequestHandler);

export default router;
