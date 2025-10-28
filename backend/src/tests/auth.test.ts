import request from 'supertest';
import app from '../app';
import { User } from '../models/User';

jest.mock('../utils/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue(undefined)
}));

describe('Auth flows (Module1)', () => {
  const studentPayload = {
    name: 'Test Student',
    email: 'student@example.com',
    enrollmentId: 'ENR-100',
    password: 'Strong@123'
  };

  it('registers, verifies, and logs in a student', async () => {
    const registerResponse = await request(app)
      .post('/api/v1/auth/register/student')
      .send(studentPayload)
      .expect(201);

    expect(registerResponse.body.success).toBe(true);

    const student = await User.findOne({ email: studentPayload.email });
    expect(student).toBeTruthy();
    expect(student?.isEmailVerified).toBe(false);
    expect(student?.emailVerificationToken).toBeTruthy();

    await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: student?.emailVerificationToken })
      .expect(200);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: studentPayload.email, password: studentPayload.password })
      .expect(200);

    expect(loginResponse.body.data.user.email).toBe(studentPayload.email);
    expect(loginResponse.body.data.accessToken).toBeDefined();
  });

  it('locks an account after repeated failed attempts', async () => {
    await request(app).post('/api/v1/auth/register/student').send({
      name: 'Locked User',
      email: 'locked@example.com',
      enrollmentId: 'ENR-200',
      password: 'Strong@123'
    });

    const user = await User.findOne({ email: 'locked@example.com' });
    expect(user).toBeTruthy();

    await User.updateOne({ _id: user?._id }, { isEmailVerified: true });

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'locked@example.com', password: 'WrongPassword!1' })
        .expect(401);
    }

    const lockedUser = await User.findOne({ email: 'locked@example.com' });
    expect(lockedUser?.failedLoginAttempts).toBeGreaterThanOrEqual(5);
    expect(lockedUser?.lockedAt).toBeTruthy();
  });
});
