// DTOs para módulo Document (alineado con estilo de report/project)
export interface UploadFileInput {
  originalName: string; 
  mimeType: string;     
  size: number;         
  stream?: NodeJS.ReadableStream;
  buffer?: Buffer;                 
}

export interface RelatedEntityInput {
  entityType: 'report' | 'task' | 'project';
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
  entityType: 'report' | 'task' | 'project';
  entityId: string;
}
