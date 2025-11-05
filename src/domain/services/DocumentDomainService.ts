import { Document } from '../entities/Document';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_DOCUMENTS_PER_ENTITY,
} from '../../shared/constants/document';

// Validar que el tipo MIME sea permitido
export function validateMimeType(mimeType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Tipo de archivo no permitido: ${mimeType}. Tipos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX`
    );
  }
}

// Validar que el tamaño del archivo no exceda el límite
export function validateFileSize(sizeInBytes: number): void {
  if (sizeInBytes > MAX_FILE_SIZE_BYTES) {
    const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    throw new Error(`El archivo excede el tamaño máximo permitido de ${maxSizeMB}MB`);
  }
}

// Validar que no se exceda el límite de documentos por entidad
export function validateDocumentLimit(currentCount: number): void {
  if (currentCount >= MAX_DOCUMENTS_PER_ENTITY) {
    throw new Error(
      `Se ha alcanzado el límite máximo de ${MAX_DOCUMENTS_PER_ENTITY} documentos por entidad`
    );
  }
}

// Validar archivo completo (tipo y tamaño)
export function validateDocument(mimeType: string, sizeInBytes: number): void {
  validateMimeType(mimeType);
  validateFileSize(sizeInBytes);
}

// ¿Puede el usuario eliminar este documento?
// Solo el usuario que subió el documento puede eliminarlo
export function canDeleteDocument(userId: string, document: Document): boolean {
  return document.uploadedBy === userId;
}

// ¿Puede el usuario ver este documento?
// El que lo subió o el que tiene acceso a la entidad relacionada pueden verlo
export function canViewDocument(userId: string, document: Document): boolean {
  if (document.uploadedBy === userId) return true;
  return true;
}
