// Tipos GraphQL para módulo Document
export interface RelatedEntityGQL {
  entityType: string;
  entityId: string;
}

export interface DocumentGQL {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: any; 
  relatedTo?: RelatedEntityGQL | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentInputGQL {
  file: any; 
  entityType?: string;
  entityId?: string;
}

export interface DeleteDocumentInputGQL {
  documentId: string;
}

export interface ListByEntityInputGQL {
  entityType: string;
  entityId: string;
}
