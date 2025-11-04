import { DocumentService, IFileStorageService } from '../../../application/services/DocumentService';
import { IDocumentRepository } from '../../../domain/repositories/IDocumentRepository';
import { IReportRepository } from '../../../domain/repositories/IReportRepository';
import { Document, DocumentEntityType } from '../../../domain/entities/Document';
import { Report, ReportStatus, ReportType } from '../../../domain/entities/Report';
import { UploadDocumentInput, DeleteDocumentInput, ListByEntityInput } from '../../../application/dto/documentDTO';

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc1',
    fileName: 'test-123.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    url: '/uploads/test-123.pdf',
    uploadedBy: 'user1',
    relatedTo: {
      entityType: DocumentEntityType.REPORT,
      entityId: 'report1',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'report1',
    project: 'project1',
    createdBy: 'user1',
    type: ReportType.GENERAL,
    date: new Date(),
    relatedTasks: ['task1'],
    content: 'Contenido',
    checklist: [],
    status: ReportStatus.DRAFT,
    reviewers: [],
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRepos() {
  const documentRepo: jest.Mocked<IDocumentRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEntity: jest.fn(),
    findByUploader: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const reportRepo: jest.Mocked<IReportRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findByProject: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const fileStorage: jest.Mocked<IFileStorageService> = {
    save: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  return { documentRepo, reportRepo, fileStorage };
}

describe('Application/DocumentService', () => {
  describe('uploadDocument', () => {
    it('uploads file and creates document without relation', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      fileStorage.save.mockResolvedValue({
        fileName: 'test-123.pdf',
        url: '/uploads/test-123.pdf',
      });

      const created = makeDocument({ relatedTo: undefined });
      documentRepo.create.mockResolvedValue(created);

      const input: UploadDocumentInput = {
        file: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test'),
        },
      };

      const result = await svc.uploadDocument(input, 'user1');

      expect(fileStorage.save).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          fileName: expect.stringContaining('.pdf'),
          mimeType: 'application/pdf',
        })
      );
      expect(documentRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('doc1');
    });

    it('uploads file and associates with report (draft general)', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const report = makeReport({ type: ReportType.GENERAL, status: ReportStatus.DRAFT, createdBy: 'user1', attachments: [] });
      reportRepo.findById.mockResolvedValue(report);
      reportRepo.update.mockResolvedValue({ ...report, attachments: ['/uploads/test-123.pdf'] });

      fileStorage.save.mockResolvedValue({
        fileName: 'test-123.pdf',
        url: '/uploads/test-123.pdf',
      });

      const created = makeDocument();
      documentRepo.create.mockResolvedValue(created);

      const input: UploadDocumentInput = {
        file: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test'),
        },
        relatedTo: { entityType: 'report', entityId: 'report1' },
      };

      const result = await svc.uploadDocument(input, 'user1');

      expect(reportRepo.findById).toHaveBeenCalledWith('report1');
      expect(reportRepo.update).toHaveBeenCalledWith('report1', {
        attachments: ['/uploads/test-123.pdf'],
      });
      expect(result.id).toBe('doc1');
    });

    it('throws when report not found', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      reportRepo.findById.mockResolvedValue(null);
      fileStorage.save.mockResolvedValue({
        fileName: 'test-123.pdf',
        url: '/uploads/test-123.pdf',
      });
      documentRepo.create.mockResolvedValue(makeDocument());

      const input: UploadDocumentInput = {
        file: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test'),
        },
        relatedTo: { entityType: 'report', entityId: 'report1' },
      };

      await expect(svc.uploadDocument(input, 'user1')).rejects.toThrow('Reporte no encontrado');
      expect(documentRepo.delete).toHaveBeenCalled(); 
      expect(fileStorage.delete).toHaveBeenCalled(); 
    });

    it('throws when user cannot edit report (daily)', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const report = makeReport({ type: ReportType.DAILY, status: ReportStatus.DRAFT, createdBy: 'user2' });
      reportRepo.findById.mockResolvedValue(report);
      fileStorage.save.mockResolvedValue({
        fileName: 'test-123.pdf',
        url: '/uploads/test-123.pdf',
      });
      documentRepo.create.mockResolvedValue(makeDocument());

      const input: UploadDocumentInput = {
        file: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test'),
        },
        relatedTo: { entityType: 'report', entityId: 'report1' },
      };

      await expect(svc.uploadDocument(input, 'user1')).rejects.toThrow(
        'No tienes permiso para adjuntar documentos a este reporte'
      );
      expect(documentRepo.delete).toHaveBeenCalled(); 
      expect(fileStorage.delete).toHaveBeenCalled(); 
    });

    it('throws when document limit exceeded', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const report = makeReport({
        type: ReportType.GENERAL,
        status: ReportStatus.DRAFT,
        createdBy: 'user1',
        attachments: Array(10).fill('/uploads/file.pdf'), // 10 attachments (limit)
      });
      reportRepo.findById.mockResolvedValue(report);
      fileStorage.save.mockResolvedValue({
        fileName: 'test-123.pdf',
        url: '/uploads/test-123.pdf',
      });
      const createdDoc = makeDocument();
      documentRepo.create.mockResolvedValue(createdDoc);

      const input: UploadDocumentInput = {
        file: {
          originalName: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          buffer: Buffer.from('test'),
        },
        relatedTo: { entityType: 'report', entityId: 'report1' },
      };

      await expect(svc.uploadDocument(input, 'user1')).rejects.toThrow('límite máximo');
      expect(documentRepo.delete).toHaveBeenCalledWith(createdDoc.id); 
      expect(fileStorage.delete).toHaveBeenCalledWith({
        fileName: 'test-123.pdf',
        url: '/uploads/test-123.pdf',
      }); // rollback
    });

    it('validates file type and throws for invalid MIME', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const input: UploadDocumentInput = {
        file: {
          originalName: 'video.mp4',
          mimeType: 'video/mp4',
          size: 1024,
          buffer: Buffer.from('test'),
        },
      };

      await expect(svc.uploadDocument(input, 'user1')).rejects.toThrow('Tipo de archivo no permitido');
      expect(fileStorage.save).not.toHaveBeenCalled();
      expect(documentRepo.create).not.toHaveBeenCalled();
    });

    it('validates file size and throws for files too large', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const input: UploadDocumentInput = {
        file: {
          originalName: 'large.pdf',
          mimeType: 'application/pdf',
          size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
          buffer: Buffer.alloc(11 * 1024 * 1024),
        },
      };

      await expect(svc.uploadDocument(input, 'user1')).rejects.toThrow('excede el tamaño máximo');
      expect(fileStorage.save).not.toHaveBeenCalled();
      expect(documentRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    it('deletes document uploaded by user (no relation)', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const doc = makeDocument({ uploadedBy: 'user1', relatedTo: undefined });
      documentRepo.findById.mockResolvedValue(doc);
      documentRepo.delete.mockResolvedValue(true);

      const input: DeleteDocumentInput = { documentId: 'doc1' };
      const result = await svc.deleteDocument(input, 'user1');

      expect(documentRepo.delete).toHaveBeenCalledWith('doc1');
      expect(fileStorage.delete).toHaveBeenCalledWith({
        fileName: 'test-123.pdf',
        url: '/uploads/test-123.pdf',
      });
      expect(result).toBe(true);
    });

    it('deletes document and removes from report attachments', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const doc = makeDocument({ uploadedBy: 'user1' });
      const report = makeReport({
        createdBy: 'user1',
        status: ReportStatus.DRAFT,
        type: ReportType.GENERAL,
        attachments: ['/uploads/test-123.pdf', '/uploads/other.pdf'],
      });

      documentRepo.findById.mockResolvedValue(doc);
      reportRepo.findById.mockResolvedValue(report);
      reportRepo.update.mockResolvedValue({ ...report, attachments: ['/uploads/other.pdf'] });
      documentRepo.delete.mockResolvedValue(true);

      const input: DeleteDocumentInput = { documentId: 'doc1' };
      const result = await svc.deleteDocument(input, 'user1');

      expect(reportRepo.update).toHaveBeenCalledWith('report1', {
        attachments: ['/uploads/other.pdf'],
      });
      expect(result).toBe(true);
    });

    it('throws when document not found', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      documentRepo.findById.mockResolvedValue(null);

      const input: DeleteDocumentInput = { documentId: 'doc1' };
      await expect(svc.deleteDocument(input, 'user1')).rejects.toThrow('Documento no encontrado');
    });

    it('throws when user is not uploader', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const doc = makeDocument({ uploadedBy: 'user2' });
      documentRepo.findById.mockResolvedValue(doc);

      const input: DeleteDocumentInput = { documentId: 'doc1' };
      await expect(svc.deleteDocument(input, 'user1')).rejects.toThrow(
        'No tienes permiso para eliminar este documento'
      );
    });

    it('throws when user cannot edit related report', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const doc = makeDocument({ uploadedBy: 'user1' });
      const report = makeReport({
        createdBy: 'user2',
        status: ReportStatus.DRAFT,
        type: ReportType.GENERAL,
      });

      documentRepo.findById.mockResolvedValue(doc);
      reportRepo.findById.mockResolvedValue(report);

      const input: DeleteDocumentInput = { documentId: 'doc1' };
      await expect(svc.deleteDocument(input, 'user1')).rejects.toThrow(
        'No tienes permiso para modificar adjuntos de este reporte'
      );
    });
  });

  describe('getDocumentById', () => {
    it('returns document by id', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const doc = makeDocument();
      documentRepo.findById.mockResolvedValue(doc);

      const result = await svc.getDocumentById('doc1', 'user1');

      expect(documentRepo.findById).toHaveBeenCalledWith('doc1');
      expect(result?.id).toBe('doc1');
    });

    it('returns null when document not found', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      documentRepo.findById.mockResolvedValue(null);

      const result = await svc.getDocumentById('doc1', 'user1');

      expect(result).toBeNull();
    });
  });

  describe('getDocumentsByEntity', () => {
    it('returns documents for entity', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      const docs = [makeDocument({ id: 'doc1' }), makeDocument({ id: 'doc2' })];
      documentRepo.findByEntity.mockResolvedValue(docs);

      const input: ListByEntityInput = { entityType: 'report', entityId: 'report1' };
      const result = await svc.getDocumentsByEntity(input, 'user1');

      expect(documentRepo.findByEntity).toHaveBeenCalledWith('report', 'report1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc1');
      expect(result[1].id).toBe('doc2');
    });

    it('returns empty array when no documents found', async () => {
      const { documentRepo, reportRepo, fileStorage } = makeRepos();
      const svc = new DocumentService(documentRepo, reportRepo, fileStorage);

      documentRepo.findByEntity.mockResolvedValue([]);

      const input: ListByEntityInput = { entityType: 'report', entityId: 'report1' };
      const result = await svc.getDocumentsByEntity(input, 'user1');

      expect(result).toHaveLength(0);
    });
  });
});
