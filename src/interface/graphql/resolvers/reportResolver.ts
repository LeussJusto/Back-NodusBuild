import { z } from 'zod';
import { requireAuth } from '../../../shared/utils/auth';
import { parseDate } from '../../../shared/utils/date';
import {
  CreateDailyInput,
  CreateGeneralInput,
  UpdateReportInput,
  ApproveReportInput,
  RejectReportInput,
} from '../../../application/dto/reportDTO';
import {
  ReportGQL,
  CreateDailyInputGQL,
  CreateGeneralInputGQL,
  UpdateReportInputGQL,
  ApproveReportInputGQL,
  RejectReportInputGQL,
} from '../types/reportTypes';

const reportResolver = {
  Query: {
    // Obtener un reporte por ID
    report: async (_: any, { id }: { id: string }, ctx: any): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      
      // Validación del ID
      const ReportIdSchema = z.string().min(1, 'El ID del reporte es requerido');
      const validatedId = ReportIdSchema.parse(id);
      
      return reportService.getReportById(validatedId, userId) as ReportGQL;
    },

    // Obtener todos los reportes de un proyecto
    reportsByProject: async (
      _: any,
      { projectId }: { projectId: string },
      ctx: any
    ): Promise<ReportGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      return (await reportService.getReportsByProject(projectId, userId)) as ReportGQL[];
    },

    // Obtener mis reportes de un proyecto
    myReports: async (
      _: any,
      { projectId }: { projectId: string },
      ctx: any
    ): Promise<ReportGQL[]> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      return (await reportService.getMyReports(projectId, userId)) as ReportGQL[];
    },
  },

  Mutation: {
    // Crear un reporte diario
    createDailyReport: async (
      _: any,
      { input }: { input: CreateDailyInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const CreateDailySchema = z.object({
        project: z.string().min(1, 'El proyecto es requerido'),
        date: z.string().optional(),
        content: z.string().optional(),
        checklist: z
          .array(
            z.object({
              item: z.string().min(1, 'El ítem es requerido'),
              completed: z.boolean(),
              evidenceId: z.string().optional(),
            })
          )
          .optional(),
        attachments: z.array(z.string()).optional(),
      });

      const parsed = CreateDailySchema.parse(input);

      // Mapeo de input
      const dailyInput: CreateDailyInput = {
        ...parsed,
        date: parseDate(parsed.date),
      };

      return (await reportService.createDaily(dailyInput, userId)) as ReportGQL;
    },

    // Crear un reporte general
    createGeneralReport: async (
      _: any,
      { input }: { input: CreateGeneralInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const CreateGeneralSchema = z.object({
        project: z.string().min(1, 'El proyecto es requerido'),
        taskId: z.string().min(1, 'La tarea es requerida'),
        date: z.string().optional(),
        content: z.string().optional(),
        checklist: z
          .array(
            z.object({
              item: z.string().min(1, 'El ítem es requerido'),
              completed: z.boolean(),
              evidenceId: z.string().optional(),
            })
          )
          .optional(),
        attachments: z.array(z.string()).optional(),
      });

      const parsed = CreateGeneralSchema.parse(input);

      // Mapeo de input
      const generalInput: CreateGeneralInput = {
        ...parsed,
        date: parseDate(parsed.date),
      };

      return (await reportService.createGeneral(generalInput, userId)) as ReportGQL;
    },

    // Actualizar un reporte
    updateReport: async (
      _: any,
      { id, input }: { id: string; input: UpdateReportInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const UpdateReportSchema = z.object({
        date: z.string().optional(),
        content: z.string().optional(),
        checklist: z
          .array(
            z.object({
              item: z.string().min(1, 'El ítem es requerido'),
              completed: z.boolean(),
              evidenceId: z.string().optional(),
            })
          )
          .optional(),
        attachments: z.array(z.string()).optional(),
      });

      const parsed = UpdateReportSchema.parse(input);

      // Mapeo de input
      const reportInput: UpdateReportInput = {
        ...parsed,
        date: parseDate(parsed.date),
      };

      // Determinar si es Daily o General y llamar al método correspondiente
      const report = await reportService.getReportById(id, userId);
      
      if (report.type === 'daily') {
        return (await reportService.updateDaily(id, reportInput, userId)) as ReportGQL;
      } else {
        return (await reportService.updateGeneral(id, reportInput, userId)) as ReportGQL;
      }
    },

    // Enviar reporte a revisión
    submitReportForReview: async (
      _: any,
      { id }: { id: string },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      return (await reportService.submitForReview(id, userId)) as ReportGQL;
    },

    // Aprobar reporte
    approveReport: async (
      _: any,
      { input }: { input: ApproveReportInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const ApproveReportSchema = z.object({
        reportId: z.string().min(1, 'El ID del reporte es requerido'),
        feedback: z.string().optional(),
      });

      const parsed = ApproveReportSchema.parse(input);

      const approveInput: ApproveReportInput = {
        reportId: parsed.reportId,
        feedback: parsed.feedback,
      };

      return (await reportService.approveReport(parsed.reportId, approveInput, userId)) as ReportGQL;
    },

    // Rechazar reporte
    rejectReport: async (
      _: any,
      { input }: { input: RejectReportInputGQL },
      ctx: any
    ): Promise<ReportGQL> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;

      // Validación con zod
      const RejectReportSchema = z.object({
        reportId: z.string().min(1, 'El ID del reporte es requerido'),
        feedback: z.string().optional(),
      });

      const parsed = RejectReportSchema.parse(input);

      const rejectInput: RejectReportInput = {
        reportId: parsed.reportId,
        feedback: parsed.feedback,
      };

      return (await reportService.rejectReport(parsed.reportId, rejectInput, userId)) as ReportGQL;
    },

    // Eliminar reporte
    deleteReport: async (_: any, { id }: { id: string }, ctx: any): Promise<boolean> => {
      const { userId } = requireAuth(ctx);
      const { reportService } = ctx;
      
      // Determinar si es Daily o General y llamar al método correspondiente
      const report = await reportService.getReportById(id, userId);
      
      if (report.type === 'daily') {
        return reportService.deleteDaily(id, userId);
      } else {
        return reportService.deleteGeneral(id, userId);
      }
    },
  },
};

export default reportResolver;
