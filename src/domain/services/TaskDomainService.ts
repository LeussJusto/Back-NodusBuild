import { ProjectEntity, ProjectRole } from '../entities/Project';

// ¿El usuario es miembro del proyecto?
export function isProjectMember(userId: string, project: ProjectEntity): boolean {
  return project.team.some((member) => member.user === userId);
}

// ¿El usuario puede crear tareas? (Regla: cualquier miembro del proyecto)
export function canCreateTask(userId: string, project: ProjectEntity): boolean {
  return isProjectMember(userId, project);
}

// ¿El usuario puede actualizar la tarea? (owner, ingeniero_residente, creador o asignado)
export function canUpdateTask(
  userId: string,
  project: ProjectEntity,
  taskCreatorId: string,
  taskAssignedToId?: string
): boolean {
  if (project.owner === userId) return true;
  if (taskCreatorId === userId) return true;
  if (taskAssignedToId === userId) return true;

  const member = project.team.find((m) => m.user === userId);
  if (member && member.role === ProjectRole.INGENIERO_RESIDENTE) return true;

  return false;
}

// ¿El usuario puede eliminar la tarea? (owner, ingeniero_residente o creador)
export function canDeleteTask(
  userId: string,
  project: ProjectEntity,
  taskCreatorId: string
): boolean {
  if (project.owner === userId) return true;
  if (taskCreatorId === userId) return true;

  const member = project.team.find((m) => m.user === userId);
  if (member && member.role === ProjectRole.INGENIERO_RESIDENTE) return true;

  return false;
}

// Regla: si se asigna a alguien, debe ser miembro del proyecto
export function ensureAssignedToIsProjectMember(
  assignedToId: string | undefined,
  project: ProjectEntity
): void {
  if (assignedToId && !isProjectMember(assignedToId, project)) {
    throw new Error('El usuario asignado debe ser miembro del proyecto');
  }
}

