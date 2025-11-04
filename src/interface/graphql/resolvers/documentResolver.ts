import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import {
  DocumentGQL,
  UploadDocumentInputGQL,
  DeleteDocumentInputGQL,
  ListByEntityInputGQL,
} from '../types/documentTypes';
import {
  UploadDocumentInput,
  DeleteDocumentInput,
  ListByEntityInput,
} from '../../../application/dto/documentDTO';

const documentResolver = {
  Query: {
    // Obtener un documento por ID
    document: async (_: any, { id }: { id: string }, ctx: any): Promise<DocumentGQL | null> => {
      const { userId } = requireAuth(ctx);
      const { documentService } = ctx;

      const DocumentIdSchema = z.string().min(1, 'El ID del documento es requerido');
      const validatedId = DocumentIdSchema.parse(id);

      return (await documentService.getDocumentById(validatedId, userId)) as DocumentGQL | null;
    },

    // Obtener documentos por entidad relacionada
    documentsByEntity: async (
      _: any,
      { entityType, entityId }: ListByEntityInputGQL,
      ctx: any
    ): Promise<DocumentGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { documentService } = ctx;

      const ListByEntitySchema = z.object({
        entityType: z.enum(['report', 'task', 'project'], {
          message: 'Tipo de entidad inválido',
        }),
        entityId: z.string().min(1, 'El ID de la entidad es requerido'),
      });

      const parsed = ListByEntitySchema.parse({ entityType, entityId });

      const input: ListByEntityInput = {
        entityType: parsed.entityType as 'report' | 'task' | 'project',
        entityId: parsed.entityId,
      };

      return (await documentService.getDocumentsByEntity(input, userId)) as DocumentGQL[];
    },
  },

  Mutation: {
    // Subir un documento
    uploadDocument: async (
      _: any,
      { input }: { input: UploadDocumentInputGQL },
      ctx: any
    ): Promise<DocumentGQL> => {
      const { userId } = requireAuth(ctx);
      const { documentService } = ctx;

      // Validación con zod
      const UploadDocumentSchema = z.object({
        file: z.any().refine((val) => val !== undefined, 'El archivo es requerido'),
        entityType: z.enum(['report', 'task', 'project']).optional(),
        entityId: z.string().optional(),
      });

      const parsed = UploadDocumentSchema.parse(input);

      // GraphQL Upload devuelve una Promise que resuelve a { filename, mimetype, encoding, createReadStream }
      const fileUpload = await Promise.resolve(parsed.file);
      const { filename, mimetype, createReadStream } = fileUpload;
      
      const chunks: Buffer[] = [];
      const stream = createReadStream();
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      const size = buffer.length;

      const docInput: UploadDocumentInput = {
        file: {
          originalName: filename,
          mimeType: mimetype,
          size,
          buffer,
        },
        relatedTo:
          parsed.entityType && parsed.entityId
            ? { entityType: parsed.entityType, entityId: parsed.entityId }
            : undefined,
      };

      return (await documentService.uploadDocument(docInput, userId)) as DocumentGQL;
    },

    // Eliminar un documento
    deleteDocument: async (
      _: any,
      { documentId }: DeleteDocumentInputGQL,
      ctx: any
    ): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { documentService } = ctx;

      const DeleteDocumentSchema = z.object({
        documentId: z.string().min(1, 'El ID del documento es requerido'),
      });

      const parsed = DeleteDocumentSchema.parse({ documentId });

      const input: DeleteDocumentInput = {
        documentId: parsed.documentId,
      };

      return documentService.deleteDocument(input, userId);
    },
  },
};

export default documentResolver;
