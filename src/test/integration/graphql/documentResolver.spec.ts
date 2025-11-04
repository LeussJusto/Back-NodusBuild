import documentResolver from '../../../interface/graphql/resolvers/documentResolver';
import { DocumentService } from '../../../application/services/DocumentService';
import { Document, DocumentEntityType } from '../../../domain/entities/Document';
import { ProjectRole } from '../../../domain/entities/Project';

// Use a valid project role for tests
const TEST_ROLE = ProjectRole.ALMACENERO;

// Mock del servicio
const mockDocumentService = {
  uploadDocument: jest.fn(),
  deleteDocument: jest.fn(),
  getDocumentById: jest.fn(),
  getDocumentsByEntity: jest.fn(),
} as unknown as jest.Mocked<DocumentService>;

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc1',
    fileName: 'test-123.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    url: '/uploads/test-123.pdf',
    uploadedBy: 'u1',
    relatedTo: { entityType: DocumentEntityType.REPORT, entityId: 'report1' },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    ...overrides,
  };
}

// Helper para simular GraphQL Upload
function makeGraphQLUpload(filename: string, mimetype: string, content: string) {
  return Promise.resolve({
    filename,
    mimetype,
    encoding: 'utf-8',
    createReadStream: () => {
      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(content);
      stream.push(null);
      return stream;
    },
  });
}

describe('Integration/documentResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.document', () => {
    it('returns document by id', async () => {
      const doc = makeDocument();
      mockDocumentService.getDocumentById.mockResolvedValue(doc);

      const result = await documentResolver.Query.document(
        {},
        { id: 'doc1' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.getDocumentById).toHaveBeenCalledWith('doc1', 'u1');
      expect(result).toEqual(doc);
    });

    it('throws if not authenticated', async () => {
      await expect(
        documentResolver.Query.document({}, { id: 'doc1' }, { documentService: mockDocumentService } as any)
      ).rejects.toThrow('No autenticado');
    });

    it('throws on invalid id format', async () => {
      await expect(
        documentResolver.Query.document(
          {},
          { id: '' },
          { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
        )
      ).rejects.toThrow();
    });

    it('returns null when document not found', async () => {
      mockDocumentService.getDocumentById.mockResolvedValue(null);

      const result = await documentResolver.Query.document(
        {},
        { id: 'doc999' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(result).toBeNull();
    });
  });

  describe('Query.documentsByEntity', () => {
    it('returns documents for report entity', async () => {
      const docs = [makeDocument(), makeDocument({ id: 'doc2', fileName: 'test2.pdf' })];
      mockDocumentService.getDocumentsByEntity.mockResolvedValue(docs);

      const result = await documentResolver.Query.documentsByEntity(
        {},
        { entityType: 'report', entityId: 'report1' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.getDocumentsByEntity).toHaveBeenCalledWith(
        { entityType: 'report', entityId: 'report1' },
        'u1'
      );
      expect(result).toEqual(docs);
    });

    it('returns documents for task entity', async () => {
      const docs = [makeDocument({ relatedTo: { entityType: DocumentEntityType.TASK, entityId: 'task1' } })];
      mockDocumentService.getDocumentsByEntity.mockResolvedValue(docs);

      const result = await documentResolver.Query.documentsByEntity(
        {},
        { entityType: 'task', entityId: 'task1' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.getDocumentsByEntity).toHaveBeenCalledWith(
        { entityType: 'task', entityId: 'task1' },
        'u1'
      );
      expect(result).toEqual(docs);
    });

    it('returns documents for project entity', async () => {
      const docs = [makeDocument({ relatedTo: { entityType: DocumentEntityType.PROJECT, entityId: 'project1' } })];
      mockDocumentService.getDocumentsByEntity.mockResolvedValue(docs);

      const result = await documentResolver.Query.documentsByEntity(
        {},
        { entityType: 'project', entityId: 'project1' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.getDocumentsByEntity).toHaveBeenCalledWith(
        { entityType: 'project', entityId: 'project1' },
        'u1'
      );
      expect(result).toEqual(docs);
    });

    it('returns empty array when no documents found', async () => {
      mockDocumentService.getDocumentsByEntity.mockResolvedValue([]);

      const result = await documentResolver.Query.documentsByEntity(
        {},
        { entityType: 'report', entityId: 'report999' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(result).toEqual([]);
    });

    it('throws on invalid entity type', async () => {
      await expect(
        documentResolver.Query.documentsByEntity(
          {},
          { entityType: 'invalid' as any, entityId: 'report1' },
          { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
        )
      ).rejects.toThrow('Tipo de entidad inválido');
    });

    it('throws on empty entity id', async () => {
      await expect(
        documentResolver.Query.documentsByEntity(
          {},
          { entityType: 'report', entityId: '' },
          { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation.uploadDocument', () => {
    it('uploads document without relation', async () => {
      const doc = makeDocument({ relatedTo: undefined });
      mockDocumentService.uploadDocument.mockResolvedValue(doc);

      const fileUpload = makeGraphQLUpload('test.pdf', 'application/pdf', 'test content');

      const result = await documentResolver.Mutation.uploadDocument(
        {},
        { input: { file: fileUpload } },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.uploadDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.objectContaining({
            originalName: 'test.pdf',
            mimeType: 'application/pdf',
            size: expect.any(Number),
            buffer: expect.any(Buffer),
          }),
          relatedTo: undefined,
        }),
        'u1'
      );
      expect(result).toEqual(doc);
    });

    it('uploads document with report relation', async () => {
      const doc = makeDocument();
      mockDocumentService.uploadDocument.mockResolvedValue(doc);

      const fileUpload = makeGraphQLUpload('test.pdf', 'application/pdf', 'test content');

      const result = await documentResolver.Mutation.uploadDocument(
        {},
        { input: { file: fileUpload, entityType: 'report', entityId: 'report1' } },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.uploadDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          file: expect.objectContaining({
            originalName: 'test.pdf',
            mimeType: 'application/pdf',
          }),
          relatedTo: { entityType: 'report', entityId: 'report1' },
        }),
        'u1'
      );
      expect(result).toEqual(doc);
    });

    it('uploads document with task relation', async () => {
      const doc = makeDocument({ relatedTo: { entityType: DocumentEntityType.TASK, entityId: 'task1' } });
      mockDocumentService.uploadDocument.mockResolvedValue(doc);

      const fileUpload = makeGraphQLUpload('test.pdf', 'application/pdf', 'test content');

      const result = await documentResolver.Mutation.uploadDocument(
        {},
        { input: { file: fileUpload, entityType: 'task', entityId: 'task1' } },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.uploadDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedTo: { entityType: 'task', entityId: 'task1' },
        }),
        'u1'
      );
      expect(result).toEqual(doc);
    });

    it('uploads document with project relation', async () => {
      const doc = makeDocument({ relatedTo: { entityType: DocumentEntityType.PROJECT, entityId: 'project1' } });
      mockDocumentService.uploadDocument.mockResolvedValue(doc);

      const fileUpload = makeGraphQLUpload('test.pdf', 'application/pdf', 'test content');

      const result = await documentResolver.Mutation.uploadDocument(
        {},
        { input: { file: fileUpload, entityType: 'project', entityId: 'project1' } },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.uploadDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedTo: { entityType: 'project', entityId: 'project1' },
        }),
        'u1'
      );
      expect(result).toEqual(doc);
    });

    it('throws if not authenticated', async () => {
      const fileUpload = makeGraphQLUpload('test.pdf', 'application/pdf', 'test content');

      await expect(
        documentResolver.Mutation.uploadDocument(
          {},
          { input: { file: fileUpload } },
          { documentService: mockDocumentService } as any
        )
      ).rejects.toThrow('No autenticado');
    });

    it('throws on missing file', async () => {
      await expect(
        documentResolver.Mutation.uploadDocument(
          {},
          { input: { file: undefined } },
          { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
        )
      ).rejects.toThrow();
    });

    it('throws on invalid entity type in relation', async () => {
      const fileUpload = makeGraphQLUpload('test.pdf', 'application/pdf', 'test content');

      await expect(
        documentResolver.Mutation.uploadDocument(
          {},
          { input: { file: fileUpload, entityType: 'invalid' as any, entityId: 'report1' } },
          { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
        )
      ).rejects.toThrow();
    });
  });

  describe('Mutation.deleteDocument', () => {
    it('deletes document successfully', async () => {
      mockDocumentService.deleteDocument.mockResolvedValue(true);

      const result = await documentResolver.Mutation.deleteDocument(
        {},
        { documentId: 'doc1' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(mockDocumentService.deleteDocument).toHaveBeenCalledWith({ documentId: 'doc1' }, 'u1');
      expect(result).toBe(true);
    });

    it('returns false when document cannot be deleted', async () => {
      mockDocumentService.deleteDocument.mockResolvedValue(false);

      const result = await documentResolver.Mutation.deleteDocument(
        {},
        { documentId: 'doc999' },
        { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
      );

      expect(result).toBe(false);
    });

    it('throws if not authenticated', async () => {
      await expect(
        documentResolver.Mutation.deleteDocument(
          {},
          { documentId: 'doc1' },
          { documentService: mockDocumentService } as any
        )
      ).rejects.toThrow('No autenticado');
    });

    it('throws on empty document id', async () => {
      await expect(
        documentResolver.Mutation.deleteDocument(
          {},
          { documentId: '' },
          { documentService: mockDocumentService, user: { id: 'u1', role: TEST_ROLE } } as any
        )
      ).rejects.toThrow();
    });
  });
});
