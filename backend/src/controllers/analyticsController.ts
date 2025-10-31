import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Types } from 'mongoose';
import { Project } from '../models/Project';
import { Submission } from '../models/Submission';
import { EvaluationHistory } from '../models/EvaluationHistory';
import { getFacultyProgress, buildFacultyProgressExcel, getEvaluationStatsByDepartment, buildEvaluationStatsByDepartmentExcel } from '../services/reportService';
import { success } from '../utils/apiResponse';
import { Parser as Json2CsvParser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Student: submission timeline (milestone due + submissions + evaluations)
export const studentSubmissionTimeline = [
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser!._id.toString();
    const projects = await Project.find({ students: new Types.ObjectId(userId) }).lean();
    const projectIds = projects.map((p) => p._id as any);

    const submissions = await Submission.find({ student: new Types.ObjectId(userId), project: { $in: projectIds } }).lean();
    const histories = await EvaluationHistory.find({ submission: { $in: submissions.map((s) => s._id as any) } }).lean();

    type Event = { type: 'due' | 'submitted' | 'evaluated'; at: Date; project: string; milestone: string; meta?: Record<string, any> };
    const events: Event[] = [];
    for (const p of projects) {
      for (const m of p.milestones || []) {
        events.push({ type: 'due', at: new Date(m.dueDate), project: p.name, milestone: m.type, meta: { title: m.title, status: m.status } });
      }
    }
    for (const s of submissions as any[]) {
      for (const v of s.versions || []) {
        events.push({ type: 'submitted', at: new Date(v.createdAt), project: (projects.find((p:any)=>p._id.toString()===s.project.toString())?.name)||'-', milestone: s.milestoneType, meta: { version: v.versionNumber } });
      }
    }
    for (const h of histories as any[]) {
      events.push({ type: 'evaluated', at: new Date(h.createdAt), project: (projects.find((p:any)=>p._id.toString()===((submissions.find((s:any)=>s._id.toString()===h.submission.toString())?.project)||'').toString())?.name)||'-', milestone: (submissions.find((s:any)=>s._id.toString()===h.submission.toString())?.milestoneType)||'-', meta: { status: h.status, totalScore: h.totalScore } });
    }
    events.sort((a,b)=>+a.at-+b.at);

    res.json(success({ events }));
  })
];

// Student: submission timeline CSV export
export const studentSubmissionTimelineCsv = [
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser!._id.toString();
    const projects = await Project.find({ students: new Types.ObjectId(userId) }).lean();
    const projectIds = projects.map((p) => p._id as any);

    const submissions = await Submission.find({ student: new Types.ObjectId(userId), project: { $in: projectIds } }).lean();
    const histories = await EvaluationHistory.find({ submission: { $in: submissions.map((s) => s._id as any) } }).lean();

    type Row = { date: string; type: string; project: string; milestone: string; details?: string };
    const rows: Row[] = [];
    for (const p of projects as any[]) {
      for (const m of p.milestones || []) {
        rows.push({ date: new Date(m.dueDate).toISOString(), type: 'due', project: p.name, milestone: m.type, details: m.title });
      }
    }
    for (const s of submissions as any[]) {
      for (const v of s.versions || []) {
        const projName = (projects.find((p:any)=>p._id.toString()===s.project.toString())?.name)||'-';
        rows.push({ date: new Date(v.createdAt).toISOString(), type: 'submitted', project: projName, milestone: s.milestoneType, details: `v${v.versionNumber}` });
      }
    }
    for (const h of histories as any[]) {
      const sub = (submissions as any[]).find((s)=>s._id.toString()===h.submission.toString());
      const projName = (projects.find((p:any)=>p._id.toString()===(sub?.project||'').toString())?.name)||'-';
      rows.push({ date: new Date(h.createdAt).toISOString(), type: 'evaluated', project: projName, milestone: sub?.milestoneType||'-', details: `score=${h.totalScore||''}` });
    }
    rows.sort((a,b)=>a.date.localeCompare(b.date));

    const parser = new Json2CsvParser({ fields: ['date','type','project','milestone','details'] });
    const csv = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="submission-timeline.csv"');
    res.send(csv);
  })
];

// Faculty: weekly trends (counts and avg score) for last 8 weeks
export const facultyTrends = [
  asyncHandler(async (req: Request, res: Response) => {
    const facultyId = req.currentUser!._id.toString();
    const projects = await Project.find({ faculty: new Types.ObjectId(facultyId) }, { _id: 1 }).lean();
    const projIds = projects.map((p) => p._id as any);
    const subs = await Submission.find({ project: { $in: projIds } }, { _id: 1 }).lean();
    const subIds = subs.map((s) => s._id as any);

    const now = new Date();
    const buckets: { start: Date; end: Date }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7));
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
      buckets.push({ start: new Date(start.setHours(0,0,0,0)), end: new Date(end.setHours(23,59,59,999)) });
    }

    const histories = await EvaluationHistory.find({ submission: { $in: subIds } }, { totalScore: 1, createdAt: 1 }).lean();
    const series = buckets.map((b) => {
      const h = histories.filter((x: any) => {
        const t = new Date(x.createdAt).getTime();
        return t >= b.start.getTime() && t <= b.end.getTime();
      });
      const count = h.length;
      const scored = h.filter((x: any) => typeof x.totalScore === 'number');
      const avg = scored.length ? +(scored.reduce((a: number, x: any) => a + (x.totalScore || 0), 0) / scored.length).toFixed(2) : null;
      const label = `${b.start.toLocaleDateString()} - ${b.end.toLocaleDateString()}`;
      return { label, count, avgScore: avg };
    });
    res.json(success({ series }));
  })
];

export const studentSubmissionTimelineExcel = [
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser!._id.toString();
    const projects = await Project.find({ students: new Types.ObjectId(userId) }).lean();
    const projectIds = projects.map((p) => p._id as any);
    const submissions = await Submission.find({ student: new Types.ObjectId(userId), project: { $in: projectIds } }).lean();
    const histories = await EvaluationHistory.find({ submission: { $in: submissions.map((s) => s._id as any) } }).lean();

    type Row = { date: string; type: string; project: string; milestone: string; details?: string };
    const rows: Row[] = [];
    for (const p of projects as any[]) {
      for (const m of p.milestones || []) {
        rows.push({ date: new Date(m.dueDate).toISOString(), type: 'due', project: p.name, milestone: m.type, details: m.title });
      }
    }
    for (const s of submissions as any[]) {
      for (const v of s.versions || []) {
        const projName = (projects.find((p:any)=>p._id.toString()===s.project.toString())?.name)||'-';
        rows.push({ date: new Date(v.createdAt).toISOString(), type: 'submitted', project: projName, milestone: s.milestoneType, details: `v${v.versionNumber}` });
      }
    }
    for (const h of histories as any[]) {
      const sub = (submissions as any[]).find((s)=>s._id.toString()===h.submission.toString());
      const projName = (projects.find((p:any)=>p._id.toString()===(sub?.project||'').toString())?.name)||'-';
      rows.push({ date: new Date(h.createdAt).toISOString(), type: 'evaluated', project: projName, milestone: sub?.milestoneType||'-', details: `score=${h.totalScore||''}` });
    }
    rows.sort((a,b)=>a.date.localeCompare(b.date));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Timeline');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 24 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Project', key: 'project', width: 28 },
      { header: 'Milestone', key: 'milestone', width: 18 },
      { header: 'Details', key: 'details', width: 28 }
    ];
    sheet.addRows(rows.map(r => [r.date, r.type, r.project, r.milestone, r.details || '']));
    const buf = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="submission-timeline.xlsx"');
    res.send(Buffer.from(buf));
  })
];

export const studentSubmissionTimelinePdf = [
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser!._id.toString();
    const projects = await Project.find({ students: new Types.ObjectId(userId) }).lean();
    const projectIds = projects.map((p) => p._id as any);
    const submissions = await Submission.find({ student: new Types.ObjectId(userId), project: { $in: projectIds } }).lean();
    const histories = await EvaluationHistory.find({ submission: { $in: submissions.map((s) => s._id as any) } }).lean();

    type Row = { date: string; type: string; project: string; milestone: string; details?: string };
    const rows: Row[] = [];
    for (const p of projects as any[]) {
      for (const m of p.milestones || []) {
        rows.push({ date: new Date(m.dueDate).toISOString(), type: 'due', project: p.name, milestone: m.type, details: m.title });
      }
    }
    for (const s of submissions as any[]) {
      for (const v of s.versions || []) {
        const projName = (projects.find((p:any)=>p._id.toString()===s.project.toString())?.name)||'-';
        rows.push({ date: new Date(v.createdAt).toISOString(), type: 'submitted', project: projName, milestone: s.milestoneType, details: `v${v.versionNumber}` });
      }
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
    doc.fontSize(16).text('Submission Timeline', { align: 'left' });
    doc.moveDown();
    doc.fontSize(10);
    for (const r of rows) {
      doc.text(`${r.date}  •  ${r.type.toUpperCase()}  •  ${r.project}  •  ${r.milestone}  ${r.details ? '•  ' + r.details : ''}`);
    }
    doc.end();
    const pdf = await new Promise<Buffer>((resolve) => { doc.on('end', () => resolve(Buffer.concat(chunks))); });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="submission-timeline.pdf"');
    res.send(pdf);
  })
];

// Faculty: progress JSON
export const facultyProgress = [
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await getFacultyProgress(req.currentUser!._id.toString());
    res.json(success({ items: rows }));
  })
];

// Faculty: progress Excel
export const facultyProgressExcel = [
  asyncHandler(async (req: Request, res: Response) => {
    const buf = await buildFacultyProgressExcel(req.currentUser!._id.toString());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="faculty-progress.xlsx"');
    res.send(buf);
  })
];

// Admin: evaluation stats by department JSON
export const adminEvaluationStats = [
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await getEvaluationStatsByDepartment();
    res.json(success({ items: rows }));
  })
];

// Admin: evaluation stats Excel
export const adminEvaluationStatsExcel = [
  asyncHandler(async (_req: Request, res: Response) => {
    const buf = await buildEvaluationStatsByDepartmentExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="dept-evaluation-stats.xlsx"');
    res.send(buf);
  })
];
