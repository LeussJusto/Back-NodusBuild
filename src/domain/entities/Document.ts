// Tipos de entidad a la que puede asociarse un documento
export enum DocumentEntityType {
  REPORT = 'report',
  TASK = 'task',
  PROJECT = 'project',
}

// Información de la entidad relacionada
export interface DocumentRelation {
  entityType: DocumentEntityType;
  entityId: string;
}

// Entidad principal de Documento
export interface Document {
  id: string;
  fileName: string; 
  originalName: string; 
  mimeType: string; 
  size: number; 
  url: string; 
  uploadedBy: string; 
  relatedTo?: DocumentRelation; 
  createdAt: Date;
  updatedAt: Date;
}
