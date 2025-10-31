import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

export const createProjectForFaculty = asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.currentUser!._id;
  const { name, description, studentIds, studentEmails } = req.body as { name: string; description?: string; studentIds?: string[]; studentEmails?: string[] };

  // Validate students exist and are students
  let studentObjectIds: Types.ObjectId[] = [];
  if (studentIds && studentIds.length) {
    studentObjectIds = studentIds.map((id) => new Types.ObjectId(id));
    const students = await User.find({ _id: { $in: studentObjectIds }, role: 'student', isActive: true }, { _id: 1 }).lean();
    if (students.length !== studentObjectIds.length) {
      return res.status(400).json({ success: false, error: { message: 'One or more student IDs are invalid' } });
    }
  } else if (studentEmails && studentEmails.length) {
    const students = await User.find({ email: { $in: studentEmails.map((e) => e.toLowerCase()) }, role: 'student', isActive: true }, { _id: 1 }).lean();
    if (!students.length) return res.status(400).json({ success: false, error: { message: 'No matching student emails' } });
    studentObjectIds = students.map((s) => s._id as Types.ObjectId);
  } else {
    return res.status(400).json({ success: false, error: { message: 'Provide studentIds or studentEmails' } });
  }

  const project = await Project.create({ name, description, students: studentObjectIds, faculty: facultyId });

  // Notify students
  try {
    const notifications = studentObjectIds.map((sid) => ({
      recipient: sid,
      type: 'info',
      title: 'Added to project group',
      message: `You have been added to project “${name}”.`,
    }));
    await Notification.insertMany(notifications);
  } catch {}

  res.status(201).json({ success: true, data: project });
});

export const listFacultyProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await Project.find({ faculty: req.currentUser!._id }).populate('students', 'name email').lean();
  res.json({ success: true, data: projects });
});

export const updateProjectMembers = asyncHandler(async (req: Request, res: Response) => {
  const facultyId = req.currentUser!._id.toString();
  const { id } = req.params;
  const { add = [], remove = [], addEmails = [] } = (req.body || {}) as { add?: string[]; remove?: string[]; addEmails?: string[] };

  const project = await Project.findById(id);
  if (!project) return res.status(404).json({ success: false, error: { message: 'Project not found' } });
  if ((project.faculty as any)?.toString() !== facultyId) {
    return res.status(403).json({ success: false, error: { message: 'Only the supervising faculty can modify members' } });
  }

  const addSet = new Set(add.filter(Boolean));
  const removeSet = new Set(remove.filter(Boolean));
  const addIds: Types.ObjectId[] = [];
  if (addSet.size) {
    const ids = Array.from(addSet).map((s) => new Types.ObjectId(s));
    const valid = await User.countDocuments({ _id: { $in: ids }, role: 'student', isActive: true });
    if (valid !== ids.length) return res.status(400).json({ success: false, error: { message: 'Invalid student IDs in add list' } });
    addIds.push(...ids);
  }
  if (addEmails && addEmails.length) {
    const users = await User.find({ email: { $in: addEmails.map((e) => e.toLowerCase()) }, role: 'student', isActive: true }, { _id: 1 }).lean();
    addIds.push(...users.map((u) => u._id as Types.ObjectId));
  }
  if (addIds.length) {
    await Project.updateOne({ _id: id }, { $addToSet: { students: { $each: addIds } } });
  }
  if (removeSet.size) {
    const removeIds = Array.from(removeSet).map((s) => new Types.ObjectId(s));
    await Project.updateOne({ _id: id }, { $pull: { students: { $in: removeIds } } });
  }

  const updated = await Project.findById(id).populate('students', 'name email').lean();
  res.json({ success: true, data: updated });
});

export const listStudentProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await Project.find({ students: req.currentUser!._id }).populate('faculty', 'name email').lean();
  res.json({ success: true, data: projects });
});
