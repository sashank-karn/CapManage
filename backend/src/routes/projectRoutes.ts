import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validateRequest } from '../middleware/validateRequest';
import { createProjectForFaculty, listFacultyProjects, updateProjectMembers, listStudentProjects } from '../controllers/projectController';

const router = Router();

// Faculty-only project management
router.use('/faculty/projects', authenticate, authorize(['faculty']));

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    studentIds: z.array(z.string().length(24)).optional(),
    studentEmails: z.array(z.string().email()).optional()
  }).refine((d) => (d.studentIds && d.studentIds.length) || (d.studentEmails && d.studentEmails.length), { message: 'Provide studentIds or studentEmails' })
});

router.post('/faculty/projects', validateRequest(createSchema), createProjectForFaculty);
router.get('/faculty/projects', listFacultyProjects);

const memberSchema = z.object({
  params: z.object({ id: z.string().length(24) }),
  body: z.object({ add: z.array(z.string().length(24)).optional(), addEmails: z.array(z.string().email()).optional(), remove: z.array(z.string().length(24)).optional() })
});

router.patch('/faculty/projects/:id/members', validateRequest(memberSchema), updateProjectMembers);

// Student project listing
router.get('/student/projects', authenticate, listStudentProjects);

export default router;
