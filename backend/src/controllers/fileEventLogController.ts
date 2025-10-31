import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { FileEventLog } from '../models/FileEventLog';
import { Types } from 'mongoose';
import ExcelJS from 'exceljs';

function buildQuery(q: any) {
  const query: any = {};
  if (q.userId) query.user = new Types.ObjectId(q.userId);
  if (q.projectId) query.project = new Types.ObjectId(q.projectId);
  if (q.submissionId) query.submission = new Types.ObjectId(q.submissionId);
  if (q.action) query.action = q.action;
  if (q.milestoneType) query.milestoneType = q.milestoneType;
  if (q.dateFrom || q.dateTo) {
    query.createdAt = {} as any;
    if (q.dateFrom) (query.createdAt as any).$gte = new Date(q.dateFrom);
    if (q.dateTo) (query.createdAt as any).$lte = new Date(q.dateTo);
  }
  return query;
}

export const listFileEvents = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20', ...q } = req.query as any;
  const p = Math.max(parseInt(page as string, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 200);
  const query = buildQuery(q);

  const [total, items] = await Promise.all([
    FileEventLog.countDocuments(query),
    FileEventLog.find(query)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .lean()
  ]);

  res.json({ success: true, data: { total, page: p, limit: l, items } });
});

export const fileEventsExcel = asyncHandler(async (req: Request, res: Response) => {
  const query = buildQuery(req.query || {});
  const items = await FileEventLog.find(query).sort({ createdAt: -1 }).limit(5000).lean();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('File Events');
  ws.columns = [
    { header: 'Created At', key: 'createdAt', width: 24 },
    { header: 'Action', key: 'action', width: 12 },
    { header: 'User', key: 'user', width: 26 },
    { header: 'Project', key: 'project', width: 26 },
    { header: 'Submission', key: 'submission', width: 26 },
    { header: 'Version', key: 'versionNumber', width: 10 },
    { header: 'Milestone', key: 'milestoneType', width: 16 },
    { header: 'IP', key: 'ip', width: 18 },
    { header: 'User Agent', key: 'userAgent', width: 50 }
  ];
  for (const it of items) {
    ws.addRow({ ...it, createdAt: new Date(it.createdAt).toISOString() });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="file-events.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

export const fileEventsCsv = asyncHandler(async (req: Request, res: Response) => {
  const query = buildQuery(req.query || {});
  const items = await FileEventLog.find(query).sort({ createdAt: -1 }).limit(10000).lean();
  const headers = ['createdAt','action','user','project','submission','versionNumber','milestoneType','ip','userAgent'];
  const rows = [headers.join(',')];
  for (const it of items) {
    const vals = [
      new Date(it.createdAt as any).toISOString(),
      it.action,
      (it.user as any)?.toString?.() || '',
      (it.project as any)?.toString?.() || '',
      (it.submission as any)?.toString?.() || '',
      (it as any).versionNumber?.toString?.() || '',
      it.milestoneType || '',
      it.ip || '',
      (it.userAgent || '').replace(/\n|\r|"/g, ' ')
    ];
    rows.push(vals.map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
  }
  const csv = rows.join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="file-events.csv"');
  res.send(csv);
});
