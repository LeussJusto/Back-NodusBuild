import {
  IDocumentRepository,
  CreateDocumentPayload,
  UpdateDocumentPayload,
} from '../../../../domain/repositories/IDocumentRepository';
import { Document as DocumentEntity, DocumentEntityType } from '../../../../domain/entities/Document';
import { DocumentModel } from '../models/Document';

class DocumentRepository implements IDocumentRepository {
  async create(payload: CreateDocumentPayload): Promise<DocumentEntity> {
    const created = await DocumentModel.create(payload as any);
    return this.mapToEntity(created);
  }

  async findById(id: string): Promise<DocumentEntity | null> {
    const doc = await DocumentModel.findById(id)
      .populate('uploadedBy', 'email profile')
      .exec();
    return doc ? this.mapToEntity(doc) : null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<DocumentEntity[]> {
    const docs = await DocumentModel.find({
      'relatedTo.entityType': entityType,
      'relatedTo.entityId': entityId,
    })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((d) => this.mapToEntity(d));
  }

  async findByUploader(uploaderId: string): Promise<DocumentEntity[]> {
    const docs = await DocumentModel.find({ uploadedBy: uploaderId })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((d) => this.mapToEntity(d));
  }

  async update(id: string, payload: UpdateDocumentPayload): Promise<DocumentEntity | null> {
    const updated = await DocumentModel.findByIdAndUpdate(
      id,
      { $set: payload as any },
      { new: true, runValidators: true }
    )
      .populate('uploadedBy', 'email profile')
      .exec();

    return updated ? this.mapToEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await DocumentModel.findByIdAndDelete(id).exec();
    return res !== null;
  }

  // Mapea el documento de Mongoose a la entidad de dominio
  private mapToEntity(doc: any): DocumentEntity {
    return {
      id: doc._id.toString(),
      fileName: doc.fileName,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      size: doc.size,
      url: doc.url,
      uploadedBy: doc.uploadedBy?._id?.toString() || doc.uploadedBy?.toString(),
      relatedTo: doc.relatedTo
        ? {
            entityType: (doc.relatedTo.entityType as DocumentEntityType) || undefined,
            entityId: doc.relatedTo.entityId?._id?.toString() || doc.relatedTo.entityId?.toString(),
          }
        : undefined,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new DocumentRepository();
