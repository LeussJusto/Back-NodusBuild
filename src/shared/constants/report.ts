// Constantes de Report compartidas entre capas

export const REPORT_TYPES = ['daily', 'general'] as const;

export const REPORT_STATUSES = ['draft', 'in_review', 'approved', 'rejected'] as const;

// Valores por defecto para nuevos reportes
export const DEFAULT_REPORT_STATUS = 'draft' as const;

// Flujo de estados permitidos (transiciones válidas)
export const REPORT_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};
