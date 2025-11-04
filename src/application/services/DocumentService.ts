import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { IReportRepository } from '../../domain/repositories/IReportRepository';
import { Document, DocumentEntityType } from '../../domain/entities/Document';
import * as DocumentDomain from '../../domain/services/DocumentDomainService';
import * as ReportDomain from '../../domain/services/ReportDomainService';
import { generateUniqueFileName } from '../../shared/utils/document';
import { UploadDocumentInput, DeleteDocumentInput, ListByEntityInput } from '../dto/documentDTO';

// Puerto de almacenamiento de archivos (implementado en infraestructura)
export interface IFileStorageService {
  save(params: {
    stream?: NodeJS.ReadableStream;
    buffer?: Buffer;
    fileName: string;
    mimeType: string;
  }): Promise<{ fileName: string; url: string }>;

  delete(params: { fileName?: string; url?: string }): Promise<void>;
}

export class DocumentService {
  constructor(
    private documentRepository: IDocumentRepository,
    private reportRepository: IReportRepository,
    private storage: IFileStorageService
  ) {}

  // Subir un documento y (opcionalmente) asociarlo a una entidad
  async uploadDocument(input: UploadDocumentInput, userId: string): Promise<Document> {
    const { file, relatedTo } = input;

    // Validación de archivo por reglas de dominio
    DocumentDomain.validateDocument(file.mimeType, file.size);

    // Generar nombre único y guardar archivo en storage
    const uniqueName = generateUniqueFileName(file.originalName);
    const saved = await this.storage.save({
      stream: file.stream,
      buffer: file.buffer,
      fileName: uniqueName,
      mimeType: file.mimeType,
    });

    // Crear documento en la base de datos
    const toDomainEntityType = (t: string): DocumentEntityType => {
      switch (t) {
        case 'report':
          return DocumentEntityType.REPORT;
        case 'task':
          return DocumentEntityType.TASK;
        case 'project':
          return DocumentEntityType.PROJECT;
        default:
          throw new Error('Tipo de entidad no soportado');
      }
    };

    const payload = {
      fileName: saved.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      url: saved.url,
      uploadedBy: userId,
      relatedTo: relatedTo
        ? { entityType: toDomainEntityType(relatedTo.entityType), entityId: relatedTo.entityId }
        : undefined,
    } as const;

    const doc = await this.documentRepository.create(payload);

    // Si se asocia a un reporte, validar permisos y actualizar attachments
    if (relatedTo && relatedTo.entityType === 'report') {
      const report = await this.reportRepository.findById(relatedTo.entityId);
      if (!report) {
        await this.documentRepository.delete(doc.id);
        await this.storage.delete({ fileName: saved.fileName, url: saved.url }).catch(() => undefined);
        throw new Error('Reporte no encontrado');
      }

      // Validar permisos de edición sobre el reporte
      const canEdit =
        report.type === 'daily'
          ? ReportDomain.canUpdateDaily(userId, report)
          : ReportDomain.canUpdateGeneral(userId, report);
      if (!canEdit) {
        await this.documentRepository.delete(doc.id);
        await this.storage.delete({ fileName: saved.fileName, url: saved.url }).catch(() => undefined);
        throw new Error('No tienes permiso para adjuntar documentos a este reporte');
      }

      // Validar límite de documentos por entidad
      try {
        DocumentDomain.validateDocumentLimit(report.attachments?.length || 0);
      } catch (error) {
        await this.documentRepository.delete(doc.id);
        await this.storage.delete({ fileName: saved.fileName, url: saved.url }).catch(() => undefined);
        throw error;
      }

      const updated = await this.reportRepository.update(report.id, {
        attachments: [...(report.attachments || []), doc.url],
      });

      if (!updated) {
        // rollback
        await this.documentRepository.delete(doc.id);
        await this.storage.delete({ fileName: saved.fileName, url: saved.url }).catch(() => undefined);
        throw new Error('No se pudo actualizar el reporte con el adjunto');
      }
    }

    return doc;
  }

  // Eliminar un documento (y quitar su URL de attachments si aplica)
  async deleteDocument(input: DeleteDocumentInput, userId: string): Promise<boolean> {
    const { documentId } = input;
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) throw new Error('Documento no encontrado');

    if (!DocumentDomain.canDeleteDocument(userId, doc)) {
      throw new Error('No tienes permiso para eliminar este documento');
    }

    if (doc.relatedTo && doc.relatedTo.entityType === 'report') {
      const report = await this.reportRepository.findById(doc.relatedTo.entityId);
      if (report) {
        const canEdit =
          report.type === 'daily'
            ? ReportDomain.canUpdateDaily(userId, report)
            : ReportDomain.canUpdateGeneral(userId, report);
        if (!canEdit) {
          throw new Error('No tienes permiso para modificar adjuntos de este reporte');
        }
        const newAttachments = (report.attachments || []).filter((u) => u !== doc.url);
        await this.reportRepository.update(report.id, { attachments: newAttachments });
      }
    }

    await this.storage.delete({ fileName: doc.fileName, url: doc.url }).catch(() => undefined);
    return this.documentRepository.delete(documentId);
  }

  async getDocumentById(id: string, _userId: string): Promise<Document | null> {
    return this.documentRepository.findById(id);
  }

  async getDocumentsByEntity(input: ListByEntityInput, _userId: string): Promise<Document[]> {
    return this.documentRepository.findByEntity(input.entityType, input.entityId);
  }
}
