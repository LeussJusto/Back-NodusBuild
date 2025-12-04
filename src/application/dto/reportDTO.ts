import { ReportStatus, ReportChecklistItem } from '../../domain/entities/Report';

// DTO para ítem de checklist en reporte (usa la interfaz del dominio)
export type ReportChecklistItemInput = ReportChecklistItem;

// DTO para crear un reporte Daily
export interface CreateDailyInput {
  project: string;
  taskId?: string;
  date?: Date; 
  content?: string;
  checklist?: ReportChecklistItemInput[];
  attachments?: string[];
}

// DTO para crear un reporte General
export interface CreateGeneralInput {
  project: string;
  taskId: string; 
  date?: Date;
  content?: string;
  checklist?: ReportChecklistItemInput[];
  attachments?: string[];
}

// DTO para actualizar un reporte (Daily o General)
export interface UpdateReportInput {
  date?: Date;
  content?: string;
  checklist?: ReportChecklistItemInput[];
  attachments?: string[];
  status?: ReportStatus;
}

// DTO para enviar reporte a revisión
export interface SubmitReportInput {
  reportId: string;
}

// DTO para aprobar un reporte (solo residente)
export interface ApproveReportInput {
  reportId: string;
  feedback?: string; 
}

// DTO para rechazar un reporte (solo residente)
export interface RejectReportInput {
  reportId: string;
  feedback?: string; 
}
