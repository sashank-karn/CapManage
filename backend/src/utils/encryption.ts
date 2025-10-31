import crypto from 'crypto';
import fs from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipe = promisify(pipeline);

export type EncryptionMeta = {
  algo: 'aes-256-gcm';
  iv: string; // base64
  tag: string; // base64
  size: number; // encrypted size in bytes
};

function getKey(): Buffer {
  const raw = process.env.FILE_ENCRYPTION_KEY || '';
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FILE_ENCRYPTION_KEY is required in production');
    }
    // Dev fallback: insecure zero key (only for local/dev)
    return Buffer.alloc(32, 0);
  }
  // Accept base64 (44 chars) or hex (64 chars) or raw 32 bytes encoded in utf-8
  try {
    if (/^[A-Fa-f0-9]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    const b64 = Buffer.from(raw, 'base64');
    if (b64.length === 32) return b64;
  } catch {}
  const buf = Buffer.from(raw);
  if (buf.length === 32) return buf;
  throw new Error('FILE_ENCRYPTION_KEY must represent 32 bytes (hex/base64/32-byte string)');
}

export async function encryptFile(inputPath: string, outputPath: string): Promise<EncryptionMeta> {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const key = getKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  await pipe(fs.createReadStream(inputPath), cipher, fs.createWriteStream(outputPath));

  const tag = cipher.getAuthTag();
  const stat = fs.statSync(outputPath);
  return {
    algo: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    size: stat.size
  };
}

export async function decryptToStream(meta: EncryptionMeta, inputPath: string, outStream: NodeJS.WritableStream): Promise<void> {
  const key = getKey();
  const iv = Buffer.from(meta.iv, 'base64');
  const tag = Buffer.from(meta.tag, 'base64');
  const decipher = crypto.createDecipheriv(meta.algo, key, iv);
  decipher.setAuthTag(tag);
  await pipe(fs.createReadStream(inputPath), decipher, outStream as any);
}
