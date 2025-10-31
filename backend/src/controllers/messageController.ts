import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { Message } from '../models/Message';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { sendMail } from '../utils/mailer';
import { getIO } from '../socket';

export const sendMessageController = asyncHandler(async (req: Request, res: Response) => {
  const senderId = req.currentUser!._id;
  const { text, projectId, recipientId } = req.body as { text: string; projectId?: string; recipientId?: string };
  if (!text || !text.trim()) return res.status(400).json({ success: false, error: { message: 'Message text is required' } });

  let participants: Types.ObjectId[] = [];
  let project: Types.ObjectId | undefined = undefined;

  if (projectId) {
    const projectDoc = await Project.findById(projectId).lean();
    if (!projectDoc) return res.status(404).json({ success: false, error: { message: 'Project not found' } });

    const senderStr = senderId.toString();
    const isMember = projectDoc.students.map((s: any) => s.toString()).includes(senderStr) || (projectDoc.faculty as any)?.toString() === senderStr;
    if (!isMember) return res.status(403).json({ success: false, error: { message: 'Not a member of the project' } });

    participants = [ ...(projectDoc.students as any[]).map((s) => new Types.ObjectId(s)), projectDoc.faculty ? new Types.ObjectId(projectDoc.faculty as any) : undefined ].filter(Boolean) as Types.ObjectId[];
    project = new Types.ObjectId(projectId);
  } else if (recipientId) {
    const [sender, recipient] = await Promise.all([
      User.findById(senderId, { _id: 1, role: 1 }).lean(),
      User.findById(recipientId, { _id: 1, role: 1 }).lean()
    ]);
    if (!recipient) return res.status(404).json({ success: false, error: { message: 'Recipient not found' } });
    if (!sender) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const roles = new Set([sender.role, recipient.role]);
    // Only allow student <-> faculty direct messages
    if (!(roles.has('student') && roles.has('faculty'))) {
      return res.status(403).json({ success: false, error: { message: 'Direct messages are limited to student and faculty pairs' } });
    }

    // Require at least one shared project relation
    const studentId = sender.role === 'student' ? sender._id : recipient._id;
    const facultyId = sender.role === 'faculty' ? sender._id : recipient._id;
    const sharedProject = await Project.exists({ students: new Types.ObjectId(studentId as any), faculty: new Types.ObjectId(facultyId as any) });
    if (!sharedProject) {
      return res.status(403).json({ success: false, error: { message: 'No shared project between student and faculty for private chat' } });
    }

    participants = [new Types.ObjectId(senderId), new Types.ObjectId(recipientId)];
  } else {
    return res.status(400).json({ success: false, error: { message: 'Provide projectId for group chat or recipientId for direct chat' } });
  }

  const msg = await Message.create({ project, participants, sender: senderId, text: text.trim() });
  // Emit a real-time event to all participants' personal rooms
  try {
    const io = getIO();
    const targetRooms = participants
      .map((p) => p.toString())
      // ensure the sender also receives the event (in case not included uniquely)
      .concat(senderId.toString())
      .reduce((acc: string[], id) => (acc.includes(`user:${id}`) ? acc : acc.concat(`user:${id}`)), []);
    targetRooms.forEach((room) => io.to(room).emit('message:new', {
      id: String((msg as any)._id),
      projectId: project ? (project as any).toString?.() || String(project) : null,
      senderId: senderId.toString()
    }));
  } catch {}

  res.status(201).json({ success: true, data: msg });
});

export const listMessagesController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.currentUser!._id.toString();
  const { projectId, withUserId, limit } = (req.query || {}) as { projectId?: string; withUserId?: string; limit?: string };
  const lim = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 200);

  let filter: any = { participants: new Types.ObjectId(userId) };
  if (projectId) {
    filter = { project: new Types.ObjectId(projectId) };
  } else if (withUserId) {
    filter = { participants: { $all: [new Types.ObjectId(userId), new Types.ObjectId(withUserId)] } };
  }

  const items = await Message.find(filter).sort({ createdAt: -1 }).limit(lim).lean();
  res.json({ success: true, data: items.reverse() });
});

export const requestFacultyCallByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { facultyId, subject, message, projectId } = req.body as { facultyId: string; subject?: string; message: string; projectId?: string };
  const student = req.currentUser!;
  const faculty = await User.findById(facultyId).lean();
  if (!faculty || faculty.role !== 'faculty') return res.status(404).json({ success: false, error: { message: 'Faculty not found' } });

  if (projectId) {
    const project = await Project.findById(projectId).lean();
    const isMember = project && project.students.map((s: any) => s.toString()).includes(student._id.toString());
    if (!isMember) return res.status(403).json({ success: false, error: { message: 'Not a member of that project' } });
  }

  const emailSubject = subject?.trim() || `Discussion request from ${student.name}`;
  const body = `Student ${student.name} (${student.email}) requested a discussion.${projectId ? `\nProject: ${projectId}` : ''}\n\nMessage:\n${message}`;

  try {
    await sendMail({
      to: faculty.email,
      subject: emailSubject,
      text: body,
      html: `<p>Student <strong>${student.name}</strong> (${student.email}) requested a discussion.${projectId ? `<br/>Project: <code>${projectId}</code>` : ''}</p><p><strong>Message:</strong></p><pre>${message}</pre>`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: 'Failed to send email request' } });
  }

  res.json({ success: true, data: true });
});
