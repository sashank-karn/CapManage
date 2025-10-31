import { User } from '../models/User';
import { Submission } from '../models/Submission';
import { Project } from '../models/Project';
import { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

export interface SummaryCounts {
  students: number;
  faculty: number;
  admins: number;
  submissions: number;
}

export const getSummaryCounts = async (): Promise<SummaryCounts> => {
  const [students, faculty, admins, submissions] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'faculty' }),
    User.countDocuments({ role: 'admin' }),
    Submission.countDocuments({})
  ]);
  return { students, faculty, admins, submissions };
};

export const buildSummaryPdf = async (summary: SummaryCounts): Promise<Buffer> => {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const title = 'CapManage Usage Summary';
  doc.fontSize(18).text(title);
  doc.moveDown();
  doc.fontSize(12).text(`Generated at: ${new Date().toISOString()}`);
  doc.moveDown();
  doc.fontSize(14).text('Counts');
  doc.fontSize(12);
  doc.list([
    `Students: ${summary.students}`,
    `Faculty: ${summary.faculty}`,
    `Admins: ${summary.admins}`,
    `Submissions: ${summary.submissions}`
  ]);
  doc.end();
  return await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

export const buildSummaryExcel = async (summary: SummaryCounts): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Summary');
  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Count', key: 'count', width: 15 }
  ];
  sheet.addRows([
    ['Students', summary.students],
    ['Faculty', summary.faculty],
    ['Admins', summary.admins],
    ['Submissions', summary.submissions]
  ]);
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
};

export const buildUsersExcel = async (): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');
  sheet.columns = [
    { header: 'Name', key: 'name', width: 28 },
    { header: 'Email', key: 'email', width: 34 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Active', key: 'isActive', width: 10 },
    { header: 'Email Verified', key: 'isEmailVerified', width: 16 },
    { header: 'Status', key: 'facultyStatus', width: 16 },
    { header: 'Enrollment ID', key: 'enrollmentId', width: 18 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Designation', key: 'designation', width: 18 },
    { header: 'Expertise', key: 'expertise', width: 24 },
    { header: 'Created At', key: 'createdAt', width: 22 },
    { header: 'Last Login', key: 'lastLoginAt', width: 22 }
  ];

  const users = await User.find({}).lean();
  const rows = users.map((u: any) => ({
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive ? 'Yes' : 'No',
    isEmailVerified: u.isEmailVerified ? 'Yes' : 'No',
    facultyStatus: u.facultyStatus ?? '',
    enrollmentId: u.enrollmentId ?? '',
    department: u.metadata?.department ?? '',
    designation: u.metadata?.designation ?? '',
    expertise: u.metadata?.expertise ?? '',
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : ''
  }));
  sheet.addRows(rows);

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
};

export const buildEvaluationsExcel = async (filters: { studentId?: string; facultyId?: string; milestone?: string }): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Evaluations');
  sheet.columns = [
    { header: 'Student', key: 'student', width: 28 },
    { header: 'Student Email', key: 'studentEmail', width: 32 },
    { header: 'Faculty', key: 'faculty', width: 28 },
    { header: 'Project', key: 'project', width: 28 },
    { header: 'Milestone', key: 'milestone', width: 14 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Total Score', key: 'total', width: 14 },
    { header: 'Revision Due', key: 'revisionDue', width: 22 },
    { header: 'Updated At', key: 'updatedAt', width: 22 }
  ];

  const query: any = {};
  if (filters.milestone) query.milestoneType = filters.milestone;
  if (filters.studentId) query.student = filters.studentId;
  if (filters.facultyId) query.faculty = filters.facultyId;

  const items = await Submission.find(query)
    .populate('student', 'name email')
    .populate('faculty', 'name email')
    .populate('project', 'name')
    .sort({ updatedAt: -1 })
    .lean();

  const rows = items.map((s: any) => ([
    s.student?.name || '-',
    s.student?.email || '-',
    s.faculty?.name || '-',
    s.project?.name || '-',
    s.milestoneType,
    s.status,
    typeof s.totalScore === 'number' ? s.totalScore : '',
    s.revisionDueDate ? new Date(s.revisionDueDate).toISOString() : '',
    s.updatedAt ? new Date(s.updatedAt).toISOString() : ''
  ]));
  sheet.addRows(rows);

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
};

// Faculty progress (per student/team) — JSON + Excel
export interface FacultyProgressRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  projectId: string;
  projectName: string;
  totalMilestones: number;
  completedMilestones: number;
  completionPercent: number; // 0-100
  lateCount: number; // milestones past due and not completed
}

export const getFacultyProgress = async (facultyId: string): Promise<FacultyProgressRow[]> => {
  const projects = await Project.find({ faculty: new Types.ObjectId(facultyId) }, { name: 1, students: 1, milestones: 1 }).lean();
  const studentIds = Array.from(new Set(projects.flatMap((p) => (p.students || []).map((s) => s.toString())))).map((id) => new Types.ObjectId(id));
  const students = await User.find({ _id: { $in: studentIds } }, { name: 1, email: 1 }).lean();
  const studentMap = new Map(students.map((s: any) => [s._id.toString(), s]));

  const rows: FacultyProgressRow[] = [];
  for (const p of projects) {
    const total = (p.milestones || []).length;
    for (const sid of p.students || []) {
      const student = studentMap.get(sid.toString());
      const completed = (p.milestones || []).filter((m: any) => m.status === 'completed').length;
      const late = (p.milestones || []).filter((m: any) => m.dueDate && new Date(m.dueDate).getTime() < Date.now() && m.status !== 'completed').length;
      rows.push({
        studentId: sid.toString(),
        studentName: student?.name || '-',
        studentEmail: student?.email || '-',
        projectId: (p._id as any).toString(),
        projectName: p.name,
        totalMilestones: total,
        completedMilestones: completed,
        completionPercent: total ? Math.round((completed / total) * 100) : 0,
        lateCount: late
      });
    }
  }
  return rows;
};

export const buildFacultyProgressExcel = async (facultyId: string): Promise<Buffer> => {
  const rows = await getFacultyProgress(facultyId);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Progress');
  sheet.columns = [
    { header: 'Student', key: 'student', width: 28 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Project', key: 'project', width: 28 },
    { header: 'Total Milestones', key: 'total', width: 16 },
    { header: 'Completed', key: 'completed', width: 12 },
    { header: 'Completion %', key: 'percent', width: 14 },
    { header: 'Late Count', key: 'late', width: 12 }
  ];
  sheet.addRows(
    rows.map((r) => [r.studentName, r.studentEmail, r.projectName, r.totalMilestones, r.completedMilestones, r.completionPercent, r.lateCount])
  );
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
};

// Admin evaluation stats by department
export interface DepartmentEvaluationStat {
  department: string;
  count: number;
  avgScore: number | null;
}

export const getEvaluationStatsByDepartment = async (): Promise<DepartmentEvaluationStat[]> => {
  // Map projects -> faculty department, then aggregate submissions
  const projects = await Project.find({}, { faculty: 1 }).lean();
  const facultyIds = Array.from(new Set(projects.map((p) => (p.faculty as any)?.toString()).filter(Boolean))).map((id) => new Types.ObjectId(id));
  const faculties = await User.find({ _id: { $in: facultyIds } }, { metadata: 1 }).lean();
  const depMap = new Map(faculties.map((f: any) => [f._id.toString(), f.metadata?.department || 'General']));

  const subs = await Submission.find({}, { totalScore: 1, project: 1 }).lean();
  const agg = new Map<string, { count: number; sum: number; scored: number }>();
  for (const s of subs) {
    const proj = projects.find((p) => (p._id as any).toString() === (s.project as any).toString());
    const dep = depMap.get((proj?.faculty as any)?.toString?.() || '') || 'General';
    const entry = agg.get(dep) || { count: 0, sum: 0, scored: 0 };
    entry.count += 1;
    if (typeof (s as any).totalScore === 'number') { entry.sum += (s as any).totalScore; entry.scored += 1; }
    agg.set(dep, entry);
  }
  return Array.from(agg.entries()).map(([department, v]) => ({ department, count: v.count, avgScore: v.scored ? +(v.sum / v.scored).toFixed(2) : null }));
};

export const buildEvaluationStatsByDepartmentExcel = async (): Promise<Buffer> => {
  const rows = await getEvaluationStatsByDepartment();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Dept Eval Stats');
  sheet.columns = [
    { header: 'Department', key: 'department', width: 28 },
    { header: 'Evaluations', key: 'count', width: 14 },
    { header: 'Avg Score', key: 'avg', width: 12 }
  ];
  sheet.addRows(rows.map((r) => [r.department, r.count, r.avgScore ?? '']));
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
};
