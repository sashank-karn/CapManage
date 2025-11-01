import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import app from '../app';
import { User } from '../models/User';
import { Project } from '../models/Project';

jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined)
}));

describe('Student submissions (integration: upload → list → preview)', () => {
  const student = {
    name: 'Upload Student',
    email: 'upload@example.com',
    enrollmentId: 'ENR-900',
    password: 'Strong@123'
  };

  const createPdfFile = (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capmanage-upload-'));
    const file = path.join(dir, 'sample.pdf');
    // Minimal PDF header bytes so mimetype is fine; content is not parsed by tests
    const content = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');
    fs.writeFileSync(file, content);
    return file;
  };

  it('allows a student to upload a file and list versions', async () => {
    // Register + verify + login
    await request(app).post('/api/v1/auth/register/student').send(student).expect(201);
    const u = await User.findOne({ email: student.email });
    await request(app).post('/api/v1/auth/verify-email').send({ token: u!.emailVerificationToken }).expect(200);
    const login = await request(app).post('/api/v1/auth/login').send({ email: student.email, password: student.password });
    const accessToken = login.body.data.accessToken as string;

    // Create a project with this student
    const project = await Project.create({
      name: 'Proj A',
      description: 'Test',
      students: [u!._id],
      milestones: [{ title: 'Synopsis', dueDate: new Date(), type: 'synopsis', status: 'pending' }]
    } as any);

    const pdfPath = createPdfFile();
    const milestoneType = 'synopsis';
    // Upload
    const uploadRes = await request(app)
      .post('/api/v1/student/submissions/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('projectId', (project._id as any).toString())
      .field('milestoneType', milestoneType)
      .attach('file', pdfPath)
      .expect(201);

    expect(uploadRes.body.success).toBe(true);
    const submissionId = uploadRes.body.data.id as string;

    // List versions
    const listRes = await request(app)
      .get('/api/v1/student/submissions/versions')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ projectId: (project._id as any).toString(), milestoneType })
      .expect(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    const v = listRes.body.data[0];
    expect(v.versionNumber).toBe(1);

    // Preview should stream decrypted contents
    await request(app)
      .get(`/api/v1/student/submissions/${submissionId}/versions/1/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect('Content-Type', /pdf|octet-stream/)
      .expect('Content-Disposition', /inline/);
  });
});
