import { Document, DocumentRelation } from '../entities/Document';

// Payload para crear un documento
export interface CreateDocumentPayload {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  relatedTo?: DocumentRelation;
}

// Payload para actualizar un documento (solo la relación)
export interface UpdateDocumentPayload {
  relatedTo?: DocumentRelation;
}

// Interfaz del repositorio de documentos - define operaciones de persistencia
export interface IDocumentRepository {
  create(payload: CreateDocumentPayload): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  findByEntity(entityType: string, entityId: string): Promise<Document[]>;
  findByUploader(uploaderId: string): Promise<Document[]>;
  update(id: string, payload: UpdateDocumentPayload): Promise<Document | null>;
  delete(id: string): Promise<boolean>;
}

export default IDocumentRepository;
