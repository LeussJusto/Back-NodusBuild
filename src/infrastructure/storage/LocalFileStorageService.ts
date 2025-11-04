import fs from 'fs';
import path from 'path';
import { IFileStorageService } from '../../application/services/DocumentService';

export class LocalFileStorageService implements IFileStorageService {
  constructor(private opts: { uploadDir?: string; publicBasePath?: string } = {}) {}

  private getUploadDir(): string {
    return this.opts.uploadDir || path.join(process.cwd(), 'uploads');
  }

  private getPublicBasePath(): string {
    return this.opts.publicBasePath || '/uploads';
  }

  async save(params: {
    stream?: NodeJS.ReadableStream;
    buffer?: Buffer;
    fileName: string;
    mimeType: string;
  }): Promise<{ fileName: string; url: string }> {
    const dir = this.getUploadDir();
    await fs.promises.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, params.fileName);

    if (params.stream) {
      await new Promise<void>((resolve, reject) => {
        const ws = fs.createWriteStream(filePath);
        params.stream!.pipe(ws);
        ws.on('finish', () => resolve());
        ws.on('error', reject);
        params.stream!.on('error', reject);
      });
    } else if (params.buffer) {
      await fs.promises.writeFile(filePath, params.buffer);
    } else {
      throw new Error('No file stream or buffer provided');
    }

    const url = `${this.getPublicBasePath()}/${encodeURIComponent(params.fileName)}`;
    return { fileName: params.fileName, url };
  }

  async delete(params: { fileName?: string; url?: string }): Promise<void> {
    let fileName = params.fileName;
    if (!fileName && params.url) {
      const decoded = decodeURIComponent(params.url);
      const parts = decoded.split('/');
      fileName = parts[parts.length - 1];
    }
    if (!fileName) return; 

    const filePath = path.join(this.getUploadDir(), fileName);
    try {
      await fs.promises.unlink(filePath);
    } catch (err: any) {
      if (err && err.code === 'ENOENT') return; 
      throw err;
    }
  }
}

export default LocalFileStorageService;
