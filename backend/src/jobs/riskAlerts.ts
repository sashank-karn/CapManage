import { Types } from 'mongoose';
import { UserPreference } from '../models/UserPreference';
import { Notification } from '../models/Notification';
import { Project } from '../models/Project';
import { getFacultyProgress } from '../services/reportService';
import { sendMail } from '../utils/mailer';

export async function runRiskAlerts() {
  // For each faculty, compute progress and flag at-risk students
  const faculties = await Project.aggregate([
    { $match: { faculty: { $ne: null } } },
    { $group: { _id: '$faculty' } }
  ]);

  for (const f of faculties) {
    const facultyId = (f._id as Types.ObjectId).toString();
    const prefs = await UserPreference.findOne({ user: new Types.ObjectId(facultyId) }).lean();
    const muted = new Set<string>((prefs as any)?.notifications?.mutedProjects?.map((id: any) => id.toString()) || []);

    const rows = await getFacultyProgress(facultyId);
    const risky = rows.filter((r) => r.lateCount >= 2 || r.completionPercent < 50);
    if (!risky.length) continue;

    // Group by project, skip muted
    const byProject = new Map<string, typeof risky>();
    for (const r of risky) {
      if (muted.has(r.projectId)) continue;
      const arr = (byProject.get(r.projectId) || []) as any[];
      arr.push(r);
      byProject.set(r.projectId, arr as any);
    }
    if (!byProject.size) continue;

    // Create one notification per faculty summarizing risky counts per project
    const summary = Array.from(byProject.values()).flat();
    const title = 'At-risk students detected';
    const message = `${summary.length} at-risk cases across ${byProject.size} project(s).`;
    await Notification.create({
      user: new Types.ObjectId(facultyId),
      title,
      message,
      module: 'reports',
      meta: { items: summary.slice(0, 10) },
      sentAt: null
    });

    // Optional: send an email summary
    try {
      const userDoc = await (await import('../models/User')).User.findById(facultyId).lean();
      if (userDoc?.email) {
        await sendMail({
          to: userDoc.email,
          subject: title,
          html: `<p>${message}</p>`
        });
      }
    } catch {}
  }
}

export function scheduleRiskAlerts() {
  // Run hourly
  setInterval(() => {
    runRiskAlerts().catch(() => {});
  }, 60 * 60 * 1000);
}
