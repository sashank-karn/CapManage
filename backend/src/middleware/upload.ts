import multer from 'multer';
import path from 'path';
import fs from 'fs';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.zip', '.mp4']);

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const base = path.resolve(process.cwd(), 'storage', 'submissions');
    const projectId = (req.body?.projectId as string) || 'unknown-project';
    const userId = (req as any).currentUser?._id?.toString?.() || 'unknown-user';
    const milestone = (req.body?.milestoneType as string) || 'general';
    const dest = path.join(base, projectId, milestone, userId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname) || '';
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${ts}-${safeBase}${ext.toLowerCase()}`);
  }
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return cb(new Error(`Unsupported file type: ${ext}. Allowed: ${Array.from(ALLOWED_EXT).join(', ')}`));
  }
  cb(null, true);
}

export const uploadSingle = multer({ storage, limits: { fileSize: MAX_SIZE_BYTES }, fileFilter }).single('file');

export const allowedFormatsDescription = () => `${Array.from(ALLOWED_EXT).map((e) => e.replace('.', '').toUpperCase()).join(', ')} (max 50MB)`;
