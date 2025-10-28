import path from 'path';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { connectDatabase, disconnectDatabase } from '../config/db';
import { Requirement } from '../models/Requirement';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { env } from '../config/env';

const workbookPath = process.env.EXCEL_WORKBOOK_PATH
  ? path.resolve(process.env.EXCEL_WORKBOOK_PATH)
  : path.resolve(__dirname, '../../..', 'end-to-end (2).xlsx');

const priorityKeys = ['Priority (MoSCoW)', 'Priority Using MoSCoW', 'Priority', 'Priority MoSCoW'];
const estimateKeys = ['Estimate', 'Estimate (Fibonacci)', 'Estimate ', 'Fibonacci Estimate', 'SP (Fibonacci)'];
const reasoningKeys = ['Reasoning', 'Reasoning ', 'Reasons', 'Explanation', 'CURE Analysis', 'CURE Analysis (Cost, Utilization, Risk, Effort)'];

interface ParsedRow {
  moduleName: string;
  rawRowIndex: number;
  initiative?: string | null;
  epic?: string | null;
  feature?: string | null;
  userStory?: string | null;
  acceptanceCriteria?: string | null;
  priority?: string | null;
  estimate?: string | number | null;
  reasoning?: string | null;
  additional?: Record<string, unknown>;
}

const normalizeHeader = (value: unknown): string => {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
};

const extractFirstAvailable = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim().length > 0) {
      return String(record[key]);
    }
  }
  return undefined;
};

const normalizeCellValue = (value: ExcelJS.CellValue | undefined): string | number | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }

    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => (typeof part.text === 'string' ? part.text : '')).join('').trim() || null;
    }

    if ('result' in value && typeof value.result === 'string') {
      return value.result;
    }
  }

  return String(value);
};

const parseSheet = async (moduleName: string, worksheet: ExcelJS.Worksheet): Promise<ParsedRow[]> => {
  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values)
    ? (headerRow.values as (ExcelJS.CellValue | undefined)[])
    : [];
  const headers = headerValues
    .slice(1)
    .map((value) => normalizeHeader(value))
    .filter((header) => header !== '');

  const parsedRows: ParsedRow[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row: ExcelJS.Row, rowNumber: number) => {
    if (rowNumber === 1) return;

    const rowValues = Array.isArray(row.values)
      ? (row.values.slice(1) as (ExcelJS.CellValue | undefined)[])
      : [];
    if (
      !rowValues.some(
        (value: ExcelJS.CellValue | ExcelJS.CellValue[] | null | undefined) =>
          value !== undefined && value !== null && String(value).trim() !== ''
      )
    ) {
      return;
    }

    const record: Record<string, unknown> = {};
    headers.forEach((header: string, index: number) => {
      record[header] = normalizeCellValue(rowValues[index]);
    });

    const additional = { ...record };
    delete additional['Initiative'];
    delete additional['Epic'];
    delete additional['Feature'];
    delete additional['User Story'];
    delete additional['Acceptance Criteria'];
    priorityKeys.forEach((key) => delete additional[key]);
    estimateKeys.forEach((key) => delete additional[key]);
    reasoningKeys.forEach((key) => delete additional[key]);

    const parsed: ParsedRow = {
      moduleName,
      rawRowIndex: rowNumber,
      initiative: (record['Initiative'] as string) ?? null,
      epic: (record['Epic'] as string) ?? null,
      feature: (record['Feature'] as string) ?? null,
      userStory: (record['User Story'] as string) ?? null,
      acceptanceCriteria: (record['Acceptance Criteria'] as string) ?? undefined,
      priority: extractFirstAvailable(record, priorityKeys) ?? null,
      estimate: extractFirstAvailable(record, estimateKeys) ?? null,
      reasoning: extractFirstAvailable(record, reasoningKeys) ?? null,
      additional
    };

    parsedRows.push(parsed);
  });

  return parsedRows;
};

const seedRequirements = async (): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  for (const worksheet of workbook.worksheets) {
    const moduleName = worksheet.name.trim();
    const rows = await parseSheet(moduleName, worksheet);

    for (const row of rows) {
      await Requirement.findOneAndUpdate(
        { moduleName: row.moduleName, rawRowIndex: row.rawRowIndex },
        row,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }
};

const seedUsers = async (): Promise<void> => {
  const defaultUsers = [
    {
      name: 'System Admin',
      email: 'admin@capmanage.local',
      password: 'Admin@123!',
      role: 'admin' as const,
      isActive: true,
      isEmailVerified: true
    },
    {
      name: 'Student One',
      email: 'student1@capmanage.local',
      password: 'Student@123',
      role: 'student' as const,
      enrollmentId: 'STU-001',
      isActive: true,
      isEmailVerified: true
    },
    {
      name: 'Faculty One',
      email: 'faculty1@capmanage.local',
      password: 'Faculty@123',
      role: 'faculty' as const,
      isActive: true,
      isEmailVerified: true,
      facultyStatus: 'approved' as const
    }
  ];

  for (const user of defaultUsers) {
    const existing = await User.findOne({ email: user.email });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(user.password, env.saltRounds);
    await User.create({
      name: user.name,
      email: user.email,
      passwordHash,
      role: user.role,
      enrollmentId: user.enrollmentId,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      facultyStatus: user.facultyStatus,
      metadata: { seeded: true }
    });
  }
};

const seedProjects = async (): Promise<void> => {
  const student = await User.findOne({ email: 'student1@capmanage.local' });
  const faculty = await User.findOne({ email: 'faculty1@capmanage.local' });

  if (!student) {
    return;
  }

  await Project.findOneAndUpdate(
    { name: 'Sample Capstone Project' },
    {
      description: 'Seeded sample project linked to Module2+ requirements.',
      students: [student._id],
      faculty: faculty?._id,
      milestones: [
        {
          title: 'Synopsis Submission',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          type: 'synopsis',
          description: 'Initial synopsis per Module5 acceptance criteria',
          status: 'pending'
        },
        {
          title: 'Midterm Evaluation',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          type: 'midterm',
          description: 'Midterm milestone for dashboard progress tracking',
          status: 'pending'
        }
      ],
      progressPercent: 10
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const seed = async (): Promise<void> => {
  console.log('Seeding database using workbook at', workbookPath);
  await connectDatabase();

  try {
    await seedRequirements();
    await seedUsers();
    await seedProjects();
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
};

void seed();
