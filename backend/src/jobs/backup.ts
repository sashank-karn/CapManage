import fs from 'fs';
import path from 'path';

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      copyDirRecursive(s, d);
    } else if (e.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

function keepLastN(dir: string, n: number) {
  if (!fs.existsSync(dir)) return;
  const items = fs
    .readdirSync(dir)
    .map((name) => ({ name, time: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  for (let i = n; i < items.length; i++) {
    const p = path.join(dir, items[i].name);
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch {}
  }
}

export async function runBackup(): Promise<void> {
  const src = path.resolve(process.cwd(), 'storage', 'submissions');
  const backupsDir = path.resolve(process.cwd(), 'storage', 'backups');
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date();
  const folder = `${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}-${String(stamp.getHours()).padStart(2, '0')}${String(stamp.getMinutes()).padStart(2, '0')}${String(stamp.getSeconds()).padStart(2, '0')}`;
  const dest = path.join(backupsDir, folder);
  try {
    copyDirRecursive(src, dest);
    keepLastN(backupsDir, 7);
  } catch (e) {
    // best-effort, non-fatal
    // eslint-disable-next-line no-console
    console.warn('Backup failed:', (e as Error)?.message);
  }
}

export function scheduleBackups() {
  // Run immediately at startup (best-effort), then every 24 hours
  void runBackup();
  const dayMs = 24 * 60 * 60 * 1000;
  setInterval(() => void runBackup(), dayMs);
}
