import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import app from '../app';
import { User } from '../models/User';
import { Project } from '../models/Project';

jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined)
}));

describe('System/Acceptance: student happy path', () => {
  const student = { name: 'Accept Student', email: 'accept@example.com', enrollmentId: 'ENR-ACPT', password: 'Strong@123' };

  const makePdf = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capmanage-accept-'));
    const file = path.join(dir, 'doc.pdf');
    fs.writeFileSync(file, Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'));
    return file;
  };

  it('registers→verifies→logs in→uploads→completes milestone→previews→downloads', async () => {
    // Register and verify
    await request(app).post('/api/v1/auth/register/student').send(student).expect(201);
    const u = await User.findOne({ email: student.email });
    await request(app).post('/api/v1/auth/verify-email').send({ token: u!.emailVerificationToken }).expect(200);

    // Login
    const login = await request(app).post('/api/v1/auth/login').send({ email: student.email, password: student.password }).expect(200);
    const accessToken = login.body.data.accessToken as string;

    // Create project with one milestone
    const project = await Project.create({
      name: 'Acceptance Proj',
      students: [u!._id],
      milestones: [{ title: 'Synopsis', dueDate: new Date(), type: 'synopsis', status: 'pending' }]
    } as any);

    // Upload
    const pdf = makePdf();
    const up = await request(app)
      .post('/api/v1/student/submissions/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('projectId', (project._id as any).toString())
      .field('milestoneType', 'synopsis')
      .attach('file', pdf)
      .expect(201);
    const submissionId = up.body.data.id as string;

    // Complete milestone
    await request(app)
      .post('/api/v1/student/projects/milestones/complete')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ projectId: (project._id as any).toString(), milestoneType: 'synopsis', notes: 'Done' })
      .expect(200);

    // Preview
    await request(app)
      .get(`/api/v1/student/submissions/${submissionId}/versions/1/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect('Content-Disposition', /inline/);

    // Download
    await request(app)
      .get(`/api/v1/student/submissions/${submissionId}/versions/1/download`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect('Content-Disposition', /attachment/);
  });
});
