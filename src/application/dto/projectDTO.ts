import { Scope, Timeline, Budget, Location, Metadata } from '../../domain/entities/Project';

// DTO para crear un nuevo proyecto
export interface CreateProjectDTO {
  name: string;
  description?: string;
  scope?: Scope;
  timeline?: Timeline;
  budget?: Budget;
  location?: Location;
  metadata?: Metadata;
}

// DTO para actualizar un proyecto
export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  status?: string;
  scope?: Scope;
  timeline?: Timeline;
  budget?: Budget;
  location?: Location;
  metadata?: Metadata;
}

// DTO para agregar miembro al equipo (puede recibir userId o email)
export interface AddTeamMemberDTO {
  userId?: string;
  email?: string; 
  role: string; 
  permissions: string[];
}
