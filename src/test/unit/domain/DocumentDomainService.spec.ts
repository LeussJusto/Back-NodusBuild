import {
  validateMimeType,
  validateFileSize,
  validateDocumentLimit,
  validateDocument,
  canDeleteDocument,
  canViewDocument,
} from '../../../domain/services/DocumentDomainService';
import { Document, DocumentEntityType } from '../../../domain/entities/Document';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_DOCUMENTS_PER_ENTITY,
} from '../../../shared/constants/document';

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

describe('Domain/DocumentDomainService', () => {
  describe('validateMimeType', () => {
    it('does not throw for allowed MIME types', () => {
      expect(() => validateMimeType('application/pdf')).not.toThrow();
      expect(() => validateMimeType('image/jpeg')).not.toThrow();
      expect(() => validateMimeType('image/jpg')).not.toThrow();
      expect(() => validateMimeType('image/png')).not.toThrow();
      expect(() => validateMimeType('application/msword')).not.toThrow();
      expect(() =>
        validateMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      ).not.toThrow();
      expect(() => validateMimeType('application/vnd.ms-excel')).not.toThrow();
      expect(() =>
        validateMimeType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ).not.toThrow();
    });

    it('throws for disallowed MIME types', () => {
      expect(() => validateMimeType('video/mp4')).toThrow('Tipo de archivo no permitido');
      expect(() => validateMimeType('application/zip')).toThrow('Tipo de archivo no permitido');
      expect(() => validateMimeType('text/html')).toThrow('Tipo de archivo no permitido');
      expect(() => validateMimeType('application/x-executable')).toThrow('Tipo de archivo no permitido');
    });

    it('throws with descriptive error message', () => {
      expect(() => validateMimeType('video/mp4')).toThrow('PDF, JPG, PNG, DOC, DOCX, XLS, XLSX');
    });
  });

  describe('validateFileSize', () => {
    it('does not throw for sizes within limit', () => {
      expect(() => validateFileSize(1024)).not.toThrow(); // 1KB
      expect(() => validateFileSize(1024 * 1024)).not.toThrow(); // 1MB
      expect(() => validateFileSize(5 * 1024 * 1024)).not.toThrow(); // 5MB
      expect(() => validateFileSize(MAX_FILE_SIZE_BYTES)).not.toThrow(); 
    });

    it('throws for sizes exceeding limit', () => {
      const overLimit = MAX_FILE_SIZE_BYTES + 1;
      expect(() => validateFileSize(overLimit)).toThrow('excede el tamaño máximo permitido');
    });

    it('throws with size in MB in error message', () => {
      const overLimit = MAX_FILE_SIZE_BYTES + 1;
      const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
      expect(() => validateFileSize(overLimit)).toThrow(`${maxMB}MB`);
    });
  });

  describe('validateDocumentLimit', () => {
    it('does not throw when below limit', () => {
      expect(() => validateDocumentLimit(0)).not.toThrow();
      expect(() => validateDocumentLimit(5)).not.toThrow();
      expect(() => validateDocumentLimit(MAX_DOCUMENTS_PER_ENTITY - 1)).not.toThrow();
    });

    it('throws when at or above limit', () => {
      expect(() => validateDocumentLimit(MAX_DOCUMENTS_PER_ENTITY)).toThrow(
        `límite máximo de ${MAX_DOCUMENTS_PER_ENTITY} documentos`
      );
      expect(() => validateDocumentLimit(MAX_DOCUMENTS_PER_ENTITY + 1)).toThrow(
        `límite máximo de ${MAX_DOCUMENTS_PER_ENTITY} documentos`
      );
    });
  });

  describe('validateDocument', () => {
    it('does not throw for valid mime type and size', () => {
      expect(() => validateDocument('application/pdf', 1024)).not.toThrow();
      expect(() => validateDocument('image/jpeg', 5 * 1024 * 1024)).not.toThrow();
    });

    it('throws for invalid mime type', () => {
      expect(() => validateDocument('video/mp4', 1024)).toThrow('Tipo de archivo no permitido');
    });

    it('throws for invalid size', () => {
      const overLimit = MAX_FILE_SIZE_BYTES + 1;
      expect(() => validateDocument('application/pdf', overLimit)).toThrow('excede el tamaño máximo');
    });

    it('validates mime type before size', () => {
      const overLimit = MAX_FILE_SIZE_BYTES + 1;
      // Si ambos son inválidos, debe fallar primero en mimeType
      expect(() => validateDocument('video/mp4', overLimit)).toThrow('Tipo de archivo no permitido');
    });
  });

  describe('canDeleteDocument', () => {
    it('returns true when user is the uploader', () => {
      const doc = makeDocument({ uploadedBy: 'user1' });
      expect(canDeleteDocument('user1', doc)).toBe(true);
    });

    it('returns false when user is not the uploader', () => {
      const doc = makeDocument({ uploadedBy: 'user1' });
      expect(canDeleteDocument('user2', doc)).toBe(false);
      expect(canDeleteDocument('userX', doc)).toBe(false);
    });
  });

  describe('canViewDocument', () => {
    it('returns true when user is the uploader', () => {
      const doc = makeDocument({ uploadedBy: 'user1' });
      expect(canViewDocument('user1', doc)).toBe(true);
    });

    it('returns true for any user (basic implementation)', () => {
      const doc = makeDocument({ uploadedBy: 'user1' });
      // Current implementation always returns true for non-uploaders
      // (access control delegated to application layer)
      expect(canViewDocument('user2', doc)).toBe(true);
      expect(canViewDocument('userX', doc)).toBe(true);
    });

    it('returns true when document has no relatedTo', () => {
      const doc = makeDocument({ uploadedBy: 'user1', relatedTo: undefined });
      expect(canViewDocument('user2', doc)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('validateFileSize handles zero size', () => {
      expect(() => validateFileSize(0)).not.toThrow();
    });

    it('validateDocumentLimit handles zero count', () => {
      expect(() => validateDocumentLimit(0)).not.toThrow();
    });

    it('validateMimeType is case-sensitive', () => {
      // MIME types should be lowercase
      expect(() => validateMimeType('APPLICATION/PDF')).toThrow();
      expect(() => validateMimeType('Image/JPEG')).toThrow();
    });
  });

  describe('constants verification', () => {
    it('ALLOWED_MIME_TYPES contains expected types', () => {
      expect(ALLOWED_MIME_TYPES).toContain('application/pdf');
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
    });

    it('MAX_FILE_SIZE_BYTES is 10MB', () => {
      expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });

    it('MAX_DOCUMENTS_PER_ENTITY is 10', () => {
      expect(MAX_DOCUMENTS_PER_ENTITY).toBe(10);
    });
  });
});
