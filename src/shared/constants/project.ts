// Constantes de Project compartidas entre capas

export const PROJECT_ROLES = [
  'ingeniero_residente',
  'ingeniero_produccion',
  'ingeniero_calidad',
  'ingeniero_especialidades',
  'ingeniero_acabados',
  'administrador_obra',
  'almacenero',
] as const;

export const PROJECT_STATUSES = [
  'planning',
  'active',
  'paused',
  'completed',
  'cancelled',
] as const;

// Permisos por rol por defecto (ajusta según negocio)
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  ingeniero_residente: [
    'dashboard_access',
    'project_crud',
    'assign_tasks',
    'view_reports',
    'approve_documents',
  ],
  ingeniero_produccion: ['dashboard_access', 'assign_tasks'],
  ingeniero_calidad: ['dashboard_access', 'view_reports'],
  ingeniero_especialidades: ['dashboard_access'],
  ingeniero_acabados: ['dashboard_access'],
  administrador_obra: ['dashboard_access', 'view_reports'],
  almacenero: ['dashboard_access'],
};
