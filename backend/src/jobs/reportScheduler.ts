import { Types } from 'mongoose';
import { ReportSchedule } from '../models/ReportSchedule';
import { sendMail } from '../utils/mailer';
import { buildFacultyProgressExcel } from '../services/reportService';
import PDFDocument from 'pdfkit';
import { Project } from '../models/Project';
import { Submission } from '../models/Submission';
import { EvaluationHistory } from '../models/EvaluationHistory';

function addDays(d: Date, days: number) { const nd = new Date(d); nd.setDate(nd.getDate() + days); return nd; }
function calcNextRun(freq: 'daily' | 'weekly' | 'monthly'): Date {
  const now = new Date();
  switch (freq) {
    case 'daily': return addDays(now, 1);
    case 'weekly': return addDays(now, 7);
    case 'monthly': { const nd = new Date(now); nd.setMonth(now.getMonth() + 1); return nd; }
  }
}

async function buildStudentTimelinePdf(userId: string): Promise<Buffer> {
  const projects = await Project.find({ students: new Types.ObjectId(userId) }).lean();
  const projectIds = projects.map((p) => p._id as any);
  const submissions = await Submission.find({ student: new Types.ObjectId(userId), project: { $in: projectIds } }).lean();
  const histories = await EvaluationHistory.find({ submission: { $in: submissions.map((s) => s._id as any) } }).lean();
  type Row = { date: string; type: string; project: string; milestone: string; details?: string };
  const rows: Row[] = [];
  for (const p of projects as any[]) {
    for (const m of p.milestones || []) rows.push({ date: new Date(m.dueDate).toISOString(), type: 'due', project: p.name, milestone: m.type, details: m.title });
  }
  for (const s of submissions as any[]) {
    for (const v of s.versions || []) rows.push({ date: new Date(v.createdAt).toISOString(), type: 'submitted', project: (projects.find((p:any)=>p._id.toString()===s.project.toString())?.name)||'-', milestone: s.milestoneType, details: `v${v.versionNumber}` });
  }
  for (const h of histories as any[]) {
    const sub = (submissions as any[]).find((s)=>s._id.toString()===h.submission.toString());
    const projName = (projects.find((p:any)=>p._id.toString()===(sub?.project||'').toString())?.name)||'-';
    rows.push({ date: new Date(h.createdAt).toISOString(), type: 'evaluated', project: projName, milestone: sub?.milestoneType||'-', details: `score=${h.totalScore||''}` });
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  const doc = new PDFDocument({ margin: 36 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.fontSize(16).text('Submission Timeline');
  doc.moveDown();
  doc.fontSize(10);
  for (const r of rows) doc.text(`${r.date}  •  ${r.type.toUpperCase()}  •  ${r.project}  •  ${r.milestone}  ${r.details ? '•  ' + r.details : ''}`);
  doc.end();
  return await new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
}

export async function runReportScheduler() {
  const now = new Date();
  const due = await ReportSchedule.find({ nextRunAt: { $lte: now } }).lean();
  for (const s of due as any[]) {
    try {
      let attachment: { filename: string; content: Buffer; contentType: string } | null = null;
      if (s.type === 'faculty-progress') {
        const buf = await buildFacultyProgressExcel(s.user.toString());
        attachment = { filename: 'faculty-progress.xlsx', content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
      } else if (s.type === 'admin-dept-stats') {
        const { buildEvaluationStatsByDepartmentExcel } = await import('../services/reportService');
        const buf = await buildEvaluationStatsByDepartmentExcel();
        attachment = { filename: 'dept-evaluation-stats.xlsx', content: buf, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
      } else if (s.type === 'student-timeline') {
        const buf = await buildStudentTimelinePdf(s.user.toString());
        attachment = { filename: 'submission-timeline.pdf', content: buf, contentType: 'application/pdf' };
      }
      if (!attachment) continue;
      const to = s.recipients?.length ? s.recipients.join(',') : undefined;
      await sendMail({
        to,
        subject: `Scheduled report: ${s.type}`,
        html: `<p>Attached is your scheduled report: <b>${s.type}</b>.</p>` ,
        attachments: [{ filename: attachment.filename, content: attachment.content, contentType: attachment.contentType } as any]
      });
      await ReportSchedule.updateOne({ _id: s._id }, { $set: { lastSentAt: new Date(), nextRunAt: calcNextRun(s.frequency) } });
    } catch {
      // skip errors, try again next cycle
      await ReportSchedule.updateOne({ _id: s._id }, { $set: { nextRunAt: calcNextRun(s.frequency) } });
    }
  }
}

export function scheduleReportScheduler() {
  setInterval(() => {
    runReportScheduler().catch(() => {});
  }, 60 * 60 * 1000);
}
