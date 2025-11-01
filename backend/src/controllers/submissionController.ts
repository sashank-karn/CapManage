import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { uploadSingle, allowedFormatsDescription } from '../middleware/upload';
import { Project } from '../models/Project';
import { Types } from 'mongoose';
import { Submission } from '../models/Submission';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { sendMail } from '../utils/mailer';
import { env } from '../config/env';
import { UserPreference } from '../models/UserPreference';
import { encryptFile, decryptToStream } from '../utils/encryption';
import { avScanFile } from '../utils/avScan';
import { FileEventLog } from '../models/FileEventLog';

export const uploadSubmission = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.currentUser!._id.toString();
  // First run multer to parse the file
  await new Promise<void>((resolve, reject) => {
    uploadSingle(req as any, res as any, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  }).catch((err) => {
    const msg = err?.message || 'Upload failed';
    res.status(400).json({ success: false, error: { message: msg, allowed: allowedFormatsDescription() } });
    throw err; // stop handler
  });

  const { projectId, milestoneType } = req.body as { projectId: string; milestoneType: string };
  if (!req.file) return res.status(400).json({ success: false, error: { message: 'File is required' } });

  // Validate membership
  const project = await Project.findById(projectId).lean();
  if (!project) return res.status(404).json({ success: false, error: { message: 'Project not found' } });
  const isMember = project.students.some((s: any) => s.toString() === studentId);
  if (!isMember) return res.status(403).json({ success: false, error: { message: 'Not a member of this project' } });

  // Compute checksum of plaintext upload, then encrypt-at-rest and remove plaintext
  const upload = req.file as Express.Multer.File;
  const filePath = (upload as any).path as string;
  const hash = crypto.createHash('sha256');
  const buf = fs.readFileSync(filePath);
  hash.update(buf);
  const checksum = hash.digest('hex');

  // Anti-virus scan (best-effort, non-blocking)
  const av = await avScanFile(filePath);

  // Encrypt to .enc alongside original, then delete plaintext
  const encPath = `${filePath}.enc`;
  let encMeta: any | undefined;
  try {
    encMeta = await encryptFile(filePath, encPath);
    try { fs.unlinkSync(filePath); } catch {}
  } catch (e) {
    // If encryption fails in production, abort; in dev, proceed with plaintext but mark enc absent
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ success: false, error: { message: 'Failed to secure file' } });
    }
  }

  // Find or create submission
  const sub = await Submission.findOne({ project: new Types.ObjectId(projectId), milestoneType, student: new Types.ObjectId(studentId) }).lean(false);
  let nextVersion = 1;
  if (sub && sub.versions?.length) nextVersion = sub.versions[sub.versions.length - 1].versionNumber + 1;

  const version = {
    versionNumber: nextVersion,
    fileUrl: encMeta ? encPath : filePath,
    checksum,
    createdAt: new Date(),
    originalName: upload.originalname,
    mimeType: upload.mimetype,
    size: upload.size,
    enc: encMeta || undefined,
    virusScan: {
      status: av.status,
      engine: av.engine,
      scannedAt: av.scannedAt,
      details: av.details
    }
  } as any;
  let submission = sub;
  if (!submission) {
    submission = new Submission({ project: project._id, milestoneType, student: new Types.ObjectId(studentId), status: 'submitted', versions: [version] } as any);
  } else {
    submission.status = 'submitted' as any;
    submission.versions.push(version);
  }
  await submission!.save();

  // Log file event (upload)
  try {
    await FileEventLog.create({
      user: new Types.ObjectId(studentId),
      action: 'upload',
      submission: submission!._id as any,
      versionNumber: nextVersion,
      project: project._id as any,
      milestoneType,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    } as any);
  } catch {}

  // Notify student (and optionally faculty)
  try {
    await Notification.create({ recipient: new Types.ObjectId(studentId), type: 'success', title: 'Upload successful', message: `Uploaded ${milestoneType} v${nextVersion}.`, module: 'student' } as any);
    if (project.faculty) {
      await Notification.create({ recipient: project.faculty as any, type: 'info', title: 'New submission', message: `A student uploaded ${milestoneType} v${nextVersion}.`, module: 'faculty', meta: { projectId: project._id, milestoneType, submissionId: (submission!._id as any).toString() } } as any);
    }
  } catch {}

  // Email confirmations (best-effort, non-blocking)
  try {
    const [studentUser, facultyUser] = await Promise.all([
      User.findById(studentId).lean(),
      project.faculty ? User.findById(project.faculty as any).lean() : Promise.resolve(null)
    ]);
    if (studentUser?.email) {
      const subject = `Submission uploaded: ${project.name || 'Project'} • ${milestoneType} v${nextVersion}`;
      const html = `
        <p>Hi ${studentUser.name || 'Student'},</p>
        <p>Your submission has been received successfully.</p>
        <ul>
          <li><strong>Project:</strong> ${project.name || '-'}</li>
          <li><strong>Milestone:</strong> ${milestoneType}</li>
          <li><strong>Version:</strong> v${nextVersion}</li>
          <li><strong>Uploaded at:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p><a href="${env.FRONTEND_BASE_URL}/student/submissions?projectId=${(project._id as any).toString()}">View your versions</a></p>
        <p>— CapManage</p>
      `;
      await sendMail({ to: studentUser.email, subject, html });
    }
    if (facultyUser?.email) {
      const subject = `New student submission: ${project.name || 'Project'} • ${milestoneType} v${nextVersion}`;
      const html = `
        <p>Hi ${facultyUser.name || 'Faculty'},</p>
        <p>A student has uploaded a new submission.</p>
        <ul>
          <li><strong>Project:</strong> ${project.name || '-'}</li>
          <li><strong>Milestone:</strong> ${milestoneType}</li>
          <li><strong>Version:</strong> v${nextVersion}</li>
          <li><strong>Uploaded by:</strong> ${studentUser?.name || 'Student'} (${studentUser?.email || ''})</li>
        </ul>
        <p><a href="${env.FRONTEND_BASE_URL}/faculty">Open Faculty dashboard</a></p>
        <p>— CapManage</p>
      `;
      await sendMail({ to: facultyUser.email, subject, html });
    }
  } catch (e) {
    // Non-blocking; log and continue
    console.warn('Upload email notification failed (ignored).');
  }

  res.status(201).json({ success: true, data: { id: (submission!._id as any).toString(), version: nextVersion } });
});

export const listSubmissionVersions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id.toString();
  const { projectId, milestoneType, studentId } = req.query as any;

  const project = await Project.findById(projectId).lean();
  if (!project) return res.status(404).json({ success: false, error: { message: 'Project not found' } });
  const isStudent = project.students.some((s: any) => s.toString() === userId);
  const isFaculty = (project.faculty as any)?.toString?.() === userId;
  if (!(isStudent || isFaculty)) return res.status(403).json({ success: false, error: { message: 'Not authorized' } });

  const ownerId = studentId || userId;
  const sub = await Submission.findOne({ project: project._id, milestoneType, student: new Types.ObjectId(ownerId) }).lean();
  if (!sub) return res.json({ success: true, data: [] });

  res.json({ success: true, data: sub.versions.map((v) => ({ versionNumber: v.versionNumber, createdAt: v.createdAt, checksum: v.checksum, submissionId: (sub._id as any).toString() })) });
});

export const downloadSubmissionVersion = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id.toString();
  const { id, version } = req.params; // id=submission id

  const sub = await Submission.findById(id).populate('project').lean();
  if (!sub) return res.status(404).json({ success: false, error: { message: 'Submission not found' } });

  const proj = sub.project as any;
  const isStudent = sub.student.toString() === userId;
  const isFaculty = (proj?.faculty?.toString?.() || proj?.faculty) === userId;
  if (!(isStudent || isFaculty)) return res.status(403).json({ success: false, error: { message: 'Not authorized' } });

  const vNum = parseInt(version, 10);
  const v = sub.versions.find((x) => x.versionNumber === vNum);
  if (!v) return res.status(404).json({ success: false, error: { message: 'Version not found' } });

  const abs = path.resolve(v.fileUrl);
  // If encrypted, decrypt on-the-fly to response
  if ((v as any).enc && (v as any).enc.iv && (v as any).enc.tag) {
    const filename = (v as any).originalName || `submission-v${v.versionNumber}`;
    const contentType = (v as any).mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
    await decryptToStream((v as any).enc, abs, res);
    // Log download
    try {
      await FileEventLog.create({
        user: new Types.ObjectId(userId),
        action: 'download',
        submission: sub._id as any,
        versionNumber: v.versionNumber,
        project: (sub.project as any)?._id || (sub.project as any),
        milestoneType: sub.milestoneType,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      } as any);
    } catch {}
    return;
  }
  // Legacy plaintext fallback
  res.download(abs);
  try {
    await FileEventLog.create({
      user: new Types.ObjectId(userId),
      action: 'download',
      submission: sub._id as any,
      versionNumber: v.versionNumber,
      project: (sub.project as any)?._id || (sub.project as any),
      milestoneType: sub.milestoneType,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    } as any);
  } catch {}
});

export const previewSubmissionVersion = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id.toString();
  const { id, version } = req.params; // id=submission id

  const sub = await Submission.findById(id).populate('project').lean();
  if (!sub) return res.status(404).json({ success: false, error: { message: 'Submission not found' } });

  const proj = sub.project as any;
  const isStudent = sub.student.toString() === userId;
  const isFaculty = (proj?.faculty?.toString?.() || proj?.faculty) === userId;
  if (!(isStudent || isFaculty)) return res.status(403).json({ success: false, error: { message: 'Not authorized' } });

  const vNum = parseInt(version, 10);
  const v = sub.versions.find((x) => x.versionNumber === vNum);
  if (!v) return res.status(404).json({ success: false, error: { message: 'Version not found' } });

  const abs = path.resolve(v.fileUrl);
  const filename = (v as any).originalName || `submission-v${v.versionNumber}`;
  const contentType = (v as any).mimeType || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`);
  if ((v as any).enc && (v as any).enc.iv && (v as any).enc.tag) {
    await decryptToStream((v as any).enc, abs, res);
    try {
      await FileEventLog.create({
        user: new Types.ObjectId(userId),
        action: 'preview',
        submission: sub._id as any,
        versionNumber: v.versionNumber,
        project: (sub.project as any)?._id || (sub.project as any),
        milestoneType: sub.milestoneType,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      } as any);
    } catch {}
    return;
  }
  // Legacy plaintext fallback
  fs.createReadStream(abs).pipe(res);
  try {
    await FileEventLog.create({
      user: new Types.ObjectId(userId),
      action: 'preview',
      submission: sub._id as any,
      versionNumber: v.versionNumber,
      project: (sub.project as any)?._id || (sub.project as any),
      milestoneType: sub.milestoneType,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    } as any);
  } catch {}
});

export const completeMilestone = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id.toString();
  const { projectId, milestoneType, notes, completedAt } = req.body as { projectId: string; milestoneType: string; notes?: string; completedAt?: string };
  const project = await Project.findById(projectId).lean(false);
  if (!project) return res.status(404).json({ success: false, error: { message: 'Project not found' } });
  const isMember = project.students.some((s: any) => s.toString() === userId);
  if (!isMember) return res.status(403).json({ success: false, error: { message: 'Not authorized' } });

  const m = project.milestones.find((m) => m.type === milestoneType);
  if (!m) return res.status(404).json({ success: false, error: { message: 'Milestone not found' } });
  (m as any).status = 'completed';
  (m as any).completedAt = completedAt ? new Date(completedAt) : new Date();
  if (notes) (m as any).notes = notes;
  await project.save();

  // Notify supervising faculty of milestone update
  try {
    if (project.faculty) {
      // Respect mute preference
      const pref = await UserPreference.findOne({ user: project.faculty as any }).lean();
      const muted = pref?.notifications?.mutedProjects?.some?.((id: any) => id.toString() === (project._id as any).toString());
      if (!muted) {
        await Notification.create({
        recipient: project.faculty as any,
        type: 'info',
        title: 'Milestone updated',
        message: `Student marked ${milestoneType} as completed in ${project.name}.`,
        module: 'faculty',
        meta: { projectId: project._id, milestoneType, actorId: userId }
        } as any);
        // Send email to faculty (best-effort)
        try {
          const facultyUser = await User.findById(project.faculty as any).lean();
          if (facultyUser?.email) {
            const subject = `Milestone completed: ${project.name} • ${milestoneType}`;
            const html = `
              <p>Hi ${facultyUser.name || 'Faculty'},</p>
              <p>A student marked a milestone as completed.</p>
              <ul>
                <li><strong>Project:</strong> ${project.name}</li>
                <li><strong>Milestone:</strong> ${milestoneType}</li>
                <li><strong>Completed At:</strong> ${(m as any).completedAt?.toISOString?.() || new Date().toISOString()}</li>
              </ul>
              <p><a href="${env.FRONTEND_BASE_URL}/faculty">Open Faculty dashboard</a></p>
            `;
            await sendMail({ to: facultyUser.email, subject, html });
          }
        } catch {}
      }
    }
  } catch {}
  res.json({ success: true, data: { type: m.type, status: m.status, completedAt: (m as any).completedAt ?? null, notes: (m as any).notes ?? '' } });
});

export const restoreSubmissionVersion = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id.toString();
  const { id, version } = req.params; // submission id, version number to restore

  const sub = await Submission.findById(id).populate('project').lean(false);
  if (!sub) return res.status(404).json({ success: false, error: { message: 'Submission not found' } });
  const proj = sub.project as any;
  const isStudent = sub.student.toString() === userId;
  const isFaculty = (proj?.faculty?.toString?.() || proj?.faculty) === userId;
  if (!(isStudent || isFaculty)) return res.status(403).json({ success: false, error: { message: 'Not authorized' } });

  const vNum = parseInt(version, 10);
  const v = sub.versions.find((x) => x.versionNumber === vNum);
  if (!v) return res.status(404).json({ success: false, error: { message: 'Version not found' } });

  // Determine next version number
  let nextVersion = 1;
  if (sub.versions?.length) nextVersion = sub.versions[sub.versions.length - 1].versionNumber + 1;

  // Duplicate the encrypted file to a new fileUrl (so historical files remain immutable)
  const src = v.fileUrl;
  const ext = path.extname(src);
  const dir = path.dirname(src);
  const base = path.basename(src, ext);
  const dest = path.join(dir, `${Date.now()}-${base}${ext}`);
  try { fs.copyFileSync(path.resolve(src), path.resolve(dest)); } catch (e) {
    return res.status(500).json({ success: false, error: { message: 'Failed to duplicate file' } });
  }

  // Build new version entry (copy metadata)
  (sub as any).versions.push({
    versionNumber: nextVersion,
    fileUrl: dest,
    checksum: (v as any).checksum,
    comments: undefined,
    createdAt: new Date(),
    originalName: (v as any).originalName,
    mimeType: (v as any).mimeType,
    size: (v as any).size,
    enc: (v as any).enc,
    virusScan: (v as any).virusScan
  });
  await (sub as any).save();

  try {
    await FileEventLog.create({
      user: new Types.ObjectId(userId),
      action: 'restore',
      submission: (sub._id as any),
      versionNumber: nextVersion,
      project: (sub.project as any)?._id || (sub.project as any),
      milestoneType: sub.milestoneType,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    } as any);
  } catch {}

  res.json({ success: true, data: { id: (sub._id as any).toString(), version: nextVersion } });
});
