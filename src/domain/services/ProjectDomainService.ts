import { ProjectEntity } from '../entities/Project';

// Determina si el usuario es el propietario del proyecto
export function isOwner(project: ProjectEntity, userId: string): boolean {
  return project.owner === userId;
}

// Determina si el usuario tiene acceso al proyecto (owner o miembro del equipo)
export function canAccess(project: ProjectEntity, userId: string): boolean {
  if (isOwner(project, userId)) return true;
  return project.team.some((tm) => tm.user === userId);
}

// Regla: solo el owner puede modificar/actualizar/eliminar
export function ensureOwnerCanModify(project: ProjectEntity, userId: string): void {
  if (!isOwner(project, userId)) {
    throw new Error('Solo el creador del proyecto puede realizar esta acción');
  }
}

// Regla: no se puede remover al owner del equipo
export function ensureNotRemovingOwner(project: ProjectEntity, targetUserId: string): void {
  if (targetUserId === project.owner) {
    throw new Error('No puedes quitar al creador del proyecto');
  }
}
