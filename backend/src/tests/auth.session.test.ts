import request from 'supertest';
import app from '../app';
import { User } from '../models/User';

jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined)
}));

describe('Auth session: refresh and logout (state transition, decision table)', () => {
  const student = {
    name: 'Sess Student',
    email: 'sess@example.com',
    enrollmentId: 'ENR-500',
    password: 'Strong@123'
  };

  it('issues new tokens on refresh and revokes old refresh on logout', async () => {
    // Register
    await request(app).post('/api/v1/auth/register/student').send(student).expect(201);
    const created = await User.findOne({ email: student.email });
    expect(created).toBeTruthy();

    // Verify email
    await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: created!.emailVerificationToken })
      .expect(200);

    // Login
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: student.email, password: student.password })
      .expect(200);

    const { accessToken, refreshToken } = login.body.data;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // Refresh -> new pair
    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshed.body.data.accessToken).toBeDefined();
    expect(refreshed.body.data.refreshToken).toBeDefined();
    expect(refreshed.body.data.refreshToken).not.toEqual(refreshToken);

    // Logout old token (should revoke)
    await request(app).post('/api/v1/auth/logout').send({ refreshToken }).expect(200);

    // Attempt to refresh with revoked token -> 401
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
  });
});
