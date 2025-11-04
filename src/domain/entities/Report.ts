// Tipos de reporte disponibles
export enum ReportType {
  DAILY = 'daily',
  GENERAL = 'general',
}

// Estados del reporte
export enum ReportStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// Ítem de checklist dentro de un reporte
export interface ReportChecklistItem {
  item: string;
  completed: boolean;
  evidenceId?: string;
}

// Revisor del reporte
export interface ReportReviewer {
  user: string; 
  approved?: boolean;
  reviewedAt?: Date;
  feedback?: string;
}

// Entidad principal de Reporte
export interface Report {
  id: string;
  project: string;
  createdBy: string; 
  type: ReportType;
  date: Date;
  relatedTasks: string[]; 
  content?: string;
  checklist: ReportChecklistItem[];
  status: ReportStatus;
  reviewers: ReportReviewer[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}
