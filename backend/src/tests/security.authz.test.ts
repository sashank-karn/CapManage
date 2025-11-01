import request from 'supertest';
import app from '../app';
import { User } from '../models/User';

jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined)
}));

describe('Authorization guards (security, negative cases)', () => {
  it('rejects unauthenticated access to admin-only endpoint', async () => {
    await request(app).get('/api/v1/auth/faculty/requests').expect(401);
  });

  it('rejects student access to admin-only endpoint (403)', async () => {
    // Register student
    const body = { name: 'Sec Student', email: 'sec@example.com', enrollmentId: 'ENR-SEC', password: 'Strong@123' };
    await request(app).post('/api/v1/auth/register/student').send(body).expect(201);
    // Verify
    const user = await User.findOne({ email: body.email });
    expect(user).toBeTruthy();
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: user!.emailVerificationToken })
      .expect(200);
    expect(verifyRes.body.success).toBe(true);

    const login = await request(app).post('/api/v1/auth/login').send({ email: body.email, password: body.password }).expect(200);
    const accessToken = login.body.data.accessToken as string;

    await request(app)
      .get('/api/v1/auth/faculty/requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });
});
