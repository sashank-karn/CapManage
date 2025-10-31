import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Project } from '../models/Project';
import { Notification } from '../models/Notification';
import { Types } from 'mongoose';
import { sendMail } from '../utils/mailer';
import { UserPreference } from '../models/UserPreference';
import { User } from '../models/User';
import { env } from '../config/env';

dayjs.extend(utc);

const windows: Array<{ label: '3d' | '1d' | '0d'; days: number }> = [
  { label: '3d', days: 3 },
  { label: '1d', days: 1 },
  { label: '0d', days: 0 }
];

const linkForStudent = (projectId: string) => `${env.FRONTEND_BASE_URL}/student/submissions?projectId=${projectId}`;

export const runDeadlineRemindersOnce = async (): Promise<void> => {
  const now = dayjs();
  const projects = await Project.find({}, { _id: 1, name: 1, students: 1, milestones: 1 }).lean();

  for (const p of projects) {
    for (const m of p.milestones || []) {
      if (!m.dueDate || m.status === 'completed') continue;
      const due = dayjs(m.dueDate);
      const diffDays = due.startOf('day').diff(now.startOf('day'), 'day');
      const win = windows.find((w) => w.days === diffDays);
      if (!win) continue;

      const key = `${(p._id as any).toString()}|${m.type}|${dayjs(m.dueDate).format('YYYY-MM-DD')}|${win.label}`;

      for (const s of p.students as any[]) {
        // De-dupe: skip if already sent
        const exists = await Notification.findOne({
          recipient: new Types.ObjectId(s),
          module: 'deadline',
          'meta.key': key
        }).lean();
        if (exists) continue;

        const pref = await UserPreference.findOne({ user: new Types.ObjectId(s) }).lean();
        const muted = pref?.notifications?.mutedProjects?.some?.((id: any) => id.toString() === (p._id as any).toString());
        if (muted) continue; // respect per-project mute
        const channels = ['in-app', 'email'] as const; // default both for critical alerts
        const title = `Upcoming deadline: ${m.title}`;
        const message = `${p.name} • ${m.type} is due on ${due.format('MMM D, YYYY')}`;
        await Notification.create({
          recipient: new Types.ObjectId(s),
          title,
          message,
          channel: channels as any,
          module: 'deadline',
          meta: { key, projectId: p._id, milestone: m.type, dueDate: m.dueDate }
        } as any);

        // Email
        try {
          const user = await User.findById(s).lean();
          if (user?.email) {
            const subject = `Reminder: ${m.title} due ${due.format('MMM D, YYYY')}`;
            const html = `
              <p>Heads up, your milestone is due soon.</p>
              <ul>
                <li><strong>Project:</strong> ${p.name}</li>
                <li><strong>Milestone:</strong> ${m.title} (${m.type})</li>
                <li><strong>Due:</strong> ${due.format('MMM D, YYYY')}</li>
              </ul>
              <p><a href="${linkForStudent((p._id as any).toString())}">Open submissions</a></p>
            `;
            await sendMail({ to: user.email, subject, html });
          }
        } catch {}
      }
    }
  }
};

export const scheduleDeadlineReminders = (): void => {
  const intervalMinutes = 60; // hourly
  // Run shortly after boot and then hourly
  setTimeout(() => void runDeadlineRemindersOnce().catch(() => {}), 10_000);
  setInterval(() => {
    void runDeadlineRemindersOnce().catch(() => {});
  }, intervalMinutes * 60 * 1000);
};
