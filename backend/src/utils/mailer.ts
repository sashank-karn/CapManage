import nodemailer from 'nodemailer';
import { env } from '../config/env';
import type { ApiError } from '../middleware/errorHandler';

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

const createTransporter = async (): Promise<nodemailer.Transporter> => {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.smtpPort) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  }

  const account = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
};

const getTransporter = (): Promise<nodemailer.Transporter> => {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }

  return transporterPromise;
};

interface SendMailInput {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}

export const sendMail = async ({ to, subject, html, text, attachments }: SendMailInput): Promise<void> => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      html,
      text,
      attachments
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Preview email: ${previewUrl}`);
    }
  } catch (error) {
    console.error('Failed to send transactional email', error);
    console.warn('Email delivery skipped. Subject:', subject);
    if (env.NODE_ENV === 'production') {
      const mailError = new Error('Unable to send email notification. Please try again later.') as ApiError;
      mailError.statusCode = 503;
      mailError.details = error;
      throw mailError;
    }
  }
};
