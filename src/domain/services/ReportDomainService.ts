import { ProjectEntity, ProjectRole } from '../entities/Project';
import { Report, ReportStatus, ReportType } from '../entities/Report';

// ¿El usuario es miembro del proyecto?
export function isProjectMember(userId: string, project: ProjectEntity): boolean {
  return project.team.some((member) => member.user === userId) || project.owner === userId;
}

// DAILY: ¿puede crear? Cualquier miembro del proyecto
export function canCreateDaily(userId: string, project: ProjectEntity): boolean {
  return isProjectMember(userId, project);
}

// GENERAL: ¿puede crear? Debe ser miembro y asignatario de la tarea objetivo
export function canCreateGeneral(
  userId: string,
  project: ProjectEntity,
  taskAssignedToId?: string
): boolean {
  if (!isProjectMember(userId, project)) return false;
  return !!taskAssignedToId && taskAssignedToId === userId;
}

// DAILY: ¿puede actualizar? Solo autor y si el estado permite edición (draft o rejected)
export function canUpdateDaily(userId: string, report: Report): boolean {
  if (report.type !== ReportType.DAILY) return false;
  if (report.createdBy !== userId) return false;
  return report.status === ReportStatus.DRAFT || report.status === ReportStatus.REJECTED;
}

// GENERAL: ¿puede actualizar? Solo autor y si está en draft
export function canUpdateGeneral(userId: string, report: Report): boolean {
  if (report.type !== ReportType.GENERAL) return false;
  if (report.createdBy !== userId) return false;
  return report.status === ReportStatus.DRAFT;
}

// DAILY: ¿puede eliminar? Solo autor y si está en draft o rejected
export function canDeleteDaily(userId: string, report: Report): boolean {
  if (report.type !== ReportType.DAILY) return false;
  if (report.createdBy !== userId) return false;
  return report.status === ReportStatus.DRAFT || report.status === ReportStatus.REJECTED;
}

// GENERAL: ¿puede eliminar? Solo autor y si está en draft
export function canDeleteGeneral(userId: string, report: Report): boolean {
  if (report.type !== ReportType.GENERAL) return false;
  if (report.createdBy !== userId) return false;
  return report.status === ReportStatus.DRAFT;
}

// DAILY: aprobar/rechazar solo residente y cuando esté en revisión
export function canModerateDaily(userId: string, project: ProjectEntity, report: Report): boolean {
  if (report.type !== ReportType.DAILY) return false;
  if (report.status !== ReportStatus.IN_REVIEW) return false;
  const member = project.team.find((m) => m.user === userId);
  return !!member && member.role === ProjectRole.INGENIERO_RESIDENTE;
}

// GENERAL: aprobar/rechazar solo residente y cuando esté en revisión
export function canModerateGeneral(userId: string, project: ProjectEntity, report: Report): boolean {
  if (report.type !== ReportType.GENERAL) return false;
  if (report.status !== ReportStatus.IN_REVIEW) return false;
  const member = project.team.find((m) => m.user === userId);
  return !!member && member.role === ProjectRole.INGENIERO_RESIDENTE;
}

// Enviar a revisión: solo autor y desde draft
export function canSubmitForReview(userId: string, report: Report): boolean {
  return report.createdBy === userId && report.status === ReportStatus.DRAFT;
}

// Validar transiciones de estado
export function validateStatusTransition(prev: ReportStatus, next: ReportStatus): void {
  const allowed: Record<ReportStatus, ReportStatus[]> = {
    [ReportStatus.DRAFT]: [ReportStatus.IN_REVIEW],
    [ReportStatus.IN_REVIEW]: [ReportStatus.APPROVED, ReportStatus.REJECTED],
    [ReportStatus.APPROVED]: [],
    [ReportStatus.REJECTED]: [],
  };
  if (!allowed[prev].includes(next)) {
    throw new Error('Transición de estado inválida');
  }
}

// Asegurar que las tareas relacionadas pertenecen al proyecto
export function ensureRelatedTasksBelongToProject(
  relatedTaskProjectIds: string[],
  projectId: string
): void {
  const allOk = relatedTaskProjectIds.every((pid) => pid === projectId);
  if (!allOk) {
    throw new Error('Una o más tareas no pertenecen al proyecto');
  }
}

// ¿Es el usuario asignatario de una tarea?
export function isTaskAssignee(userId: string, taskAssignedToId?: string): boolean {
  return !!taskAssignedToId && taskAssignedToId === userId;
}
