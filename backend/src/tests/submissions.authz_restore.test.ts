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

const makePdf = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capmanage-authz-'));
  const file = path.join(dir, 'doc.pdf');
  fs.writeFileSync(file, Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'));
  return file;
};

describe('Submissions: restore and authorization', () => {
  it('restores a previous version as the next version for the owner', async () => {
    // Student A
    const sa = { name: 'A', email: 'a@example.com', enrollmentId: 'ENR-A', password: 'Strong@123' };
    await request(app).post('/api/v1/auth/register/student').send(sa).expect(201);
    const ua = await User.findOne({ email: sa.email });
    await request(app).post('/api/v1/auth/verify-email').send({ token: ua!.emailVerificationToken }).expect(200);
    const la = await request(app).post('/api/v1/auth/login').send({ email: sa.email, password: sa.password }).expect(200);
    const tokenA = la.body.data.accessToken as string;

    // Project owned by A
    const project = await Project.create({ name: 'P', students: [ua!._id], milestones: [] } as any);

    // Upload v1
    const pdf = makePdf();
    const up = await request(app)
      .post('/api/v1/student/submissions/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('projectId', (project._id as any).toString())
      .field('milestoneType', 'synopsis')
      .attach('file', pdf)
      .expect(201);
    const submissionId = up.body.data.id as string;

    // Restore v1 -> expect new version v2
    const restore = await request(app)
      .post(`/api/v1/student/submissions/${submissionId}/versions/1/restore`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(restore.body.data.version).toBe(2);

    const list = await request(app)
      .get('/api/v1/student/submissions/versions')
      .set('Authorization', `Bearer ${tokenA}`)
      .query({ projectId: (project._id as any).toString(), milestoneType: 'synopsis' })
      .expect(200);
    const versions = list.body.data as Array<{ versionNumber: number }>;
    expect(versions.map(v => v.versionNumber)).toEqual([1, 2]);
  });

  it('denies student B from downloading student A submission (403)', async () => {
    // Student A: upload
    const sa = { name: 'A2', email: 'a2@example.com', enrollmentId: 'ENR-A2', password: 'Strong@123' };
    await request(app).post('/api/v1/auth/register/student').send(sa).expect(201);
    const ua = await User.findOne({ email: sa.email });
    await request(app).post('/api/v1/auth/verify-email').send({ token: ua!.emailVerificationToken }).expect(200);
    const la = await request(app).post('/api/v1/auth/login').send({ email: sa.email, password: sa.password }).expect(200);
    const tokenA = la.body.data.accessToken as string;
    const project = await Project.create({ name: 'P2', students: [ua!._id], milestones: [] } as any);
    const pdf = makePdf();
    const up = await request(app)
      .post('/api/v1/student/submissions/upload')
      .set('Authorization', `Bearer ${tokenA}`)
      .field('projectId', (project._id as any).toString())
      .field('milestoneType', 'synopsis')
      .attach('file', pdf)
      .expect(201);
    const submissionId = up.body.data.id as string;

    // Student B: tries to download
    const sb = { name: 'B', email: 'b@example.com', enrollmentId: 'ENR-B', password: 'Strong@123' };
    await request(app).post('/api/v1/auth/register/student').send(sb).expect(201);
    const ub = await User.findOne({ email: sb.email });
    await request(app).post('/api/v1/auth/verify-email').send({ token: ub!.emailVerificationToken }).expect(200);
    const lb = await request(app).post('/api/v1/auth/login').send({ email: sb.email, password: sb.password }).expect(200);
    const tokenB = lb.body.data.accessToken as string;

    await request(app)
      .get(`/api/v1/student/submissions/${submissionId}/versions/1/download`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });
});
