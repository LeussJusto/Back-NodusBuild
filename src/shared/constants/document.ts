// Constantes de Document compartidas entre capas
export const ALLOWED_MIME_TYPES: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const ALLOWED_FILE_EXTENSIONS: readonly string[] = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; 
export const MAX_DOCUMENTS_PER_ENTITY = 10;
export const DOCUMENT_ENTITY_TYPES = ['report', 'task', 'project'] as const;
