import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../constants/document';

// Obtiene la extensión de un archivo, en minúsculas, incluyendo el punto (e.g., .pdf)
export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot === -1) return '';
  return fileName.slice(dot).toLowerCase();
}

// Formatea tamaño en bytes a cadena legible (KB, MB, GB)
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

// Limpia y normaliza un nombre de archivo (sin ruta), manteniendo la extensión
export function sanitizeFileName(originalName: string): string {
  const name = originalName.replace(/\\/g, '/').split('/').pop() || originalName;
  const ext = getFileExtension(name);
  const base = name.replace(new RegExp(`${ext}$`), '');
  const normalized = base
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '') 
    .trim()
    .replace(/\s+/g, '-') 
    .toLowerCase();
  return `${normalized}${ext}`;
}

// Genera un nombre de archivo único basado en timestamp y aleatorio, preservando extensión
export function generateUniqueFileName(originalName: string): string {
  const sanitized = sanitizeFileName(originalName);
  const ext = getFileExtension(sanitized);
  const base = sanitized.replace(new RegExp(`${ext}$`), '');
  const rand = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now();
  return `${base}-${stamp}-${rand}${ext}`;
}

// Verifica si el tipo MIME está permitido
export function isAllowedMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

// Validación ligera de entrada de archivo (no sustituye reglas de dominio)
export function validateBasicFile(
  mimeType: string,
  sizeInBytes: number
): { ok: true } | { ok: false; reason: string } {
  if (!isAllowedMimeType(mimeType)) {
    return { ok: false, reason: `Tipo de archivo no permitido: ${mimeType}` };
  }
  if (sizeInBytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: `Tamaño máximo ${formatFileSize(MAX_FILE_SIZE_BYTES)}` };
  }
  return { ok: true };
}
