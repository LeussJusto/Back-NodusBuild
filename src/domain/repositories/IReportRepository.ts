import { Report, ReportStatus, ReportType, ReportChecklistItem } from '../entities/Report';

// Opcional: filtros para listados (extensible en el futuro)
export interface ReportListFilters {
  type?: ReportType;
  status?: ReportStatus;
  authorId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Payload para crear un reporte
export interface CreateReportPayload {
  project: string;
  createdBy: string;
  type: ReportType;
  date: Date;
  relatedTasks: string[];
  content?: string;
  checklist: ReportChecklistItem[];
  status: ReportStatus;
  reviewers: { user: string; approved?: boolean; reviewedAt?: Date; feedback?: string }[];
  attachments: string[];
}

// Payload para actualizar un reporte
export interface UpdateReportPayload {
  date?: Date;
  relatedTasks?: string[];
  content?: string;
  checklist?: ReportChecklistItem[];
  status?: ReportStatus;
  reviewers?: { user: string; approved?: boolean; reviewedAt?: Date; feedback?: string }[];
  attachments?: string[];
}

// Interfaz del repositorio de reportes - define operaciones de persistencia
export interface IReportRepository {
  create(payload: CreateReportPayload): Promise<Report>;
  findById(id: string): Promise<Report | null>;
  findByProject(projectId: string): Promise<Report[]>;
  update(id: string, payload: UpdateReportPayload): Promise<Report | null>;
  delete(id: string): Promise<boolean>;
}

export default IReportRepository;
