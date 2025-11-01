import fs from 'fs';
import os from 'os';
import path from 'path';
import { encryptFile, decryptToStream } from '../utils/encryption';

describe('Encryption utilities (AES-256-GCM)', () => {
  it('encrypts then decrypts back to original content', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capmanage-enc-'));
    const inputPath = path.join(tmpDir, 'input.txt');
    const outputPath = path.join(tmpDir, 'output.enc');

    const original = Buffer.from('Hello secure world! ' + new Date().toISOString(), 'utf8');
    fs.writeFileSync(inputPath, original);

    const meta = await encryptFile(inputPath, outputPath);
    expect(meta.algo).toBe('aes-256-gcm');
    expect(fs.existsSync(outputPath)).toBe(true);

    const decryptedPath = path.join(tmpDir, 'decrypted.txt');
    const out = fs.createWriteStream(decryptedPath);
    await decryptToStream(meta, outputPath, out);
    const decrypted = fs.readFileSync(decryptedPath);
    expect(decrypted.equals(original)).toBe(true);
  });
});
