import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { buildSummaryExcel, buildSummaryPdf, buildUsersExcel, getSummaryCounts, buildEvaluationsExcel } from '../services/reportService';
import { success } from '../utils/apiResponse';

export const getSummaryHandler = [
  asyncHandler(async (_req: Request, res: Response) => {
    const summary = await getSummaryCounts();
    res.json(success(summary));
  })
];

export const getSummaryPdfHandler = [
  asyncHandler(async (_req: Request, res: Response) => {
    const summary = await getSummaryCounts();
    const pdf = await buildSummaryPdf(summary);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="summary.pdf"');
    res.send(pdf);
  })
];

export const getSummaryExcelHandler = [
  asyncHandler(async (_req: Request, res: Response) => {
    const summary = await getSummaryCounts();
    const xlsx = await buildSummaryExcel(summary);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="summary.xlsx"');
    res.send(xlsx);
  })
];

export const getUsersExcelHandler = [
  asyncHandler(async (_req: Request, res: Response) => {
    const xlsx = await buildUsersExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users.xlsx"');
    res.send(xlsx);
  })
];

export const getEvaluationsExcelHandler = [
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = (req.query.studentId as string | undefined)?.trim();
    const facultyId = (req.query.facultyId as string | undefined)?.trim();
    const milestone = (req.query.milestone as string | undefined)?.trim();
    const xlsx = await buildEvaluationsExcel({ studentId, facultyId, milestone });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="evaluations.xlsx"');
    res.send(xlsx);
  })
];
