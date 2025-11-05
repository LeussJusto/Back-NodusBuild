import { DocumentEntityType } from '../../domain/entities/Document';

// DTOs para módulo Document
export interface UploadFileInput {
  originalName: string; 
  mimeType: string;     
  size: number;         
  stream?: NodeJS.ReadableStream;
  buffer?: Buffer;                 
}

export interface RelatedEntityInput {
  entityType: DocumentEntityType;
  entityId: string;
}

export interface UploadDocumentInput {
  file: UploadFileInput;
  relatedTo?: RelatedEntityInput; 
}

export interface DeleteDocumentInput {
  documentId: string;
}

export interface ListByEntityInput {
  entityType: DocumentEntityType;
  entityId: string;
}
