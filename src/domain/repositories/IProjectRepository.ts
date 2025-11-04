import { ProjectEntity, Scope, Timeline, Budget, Location, Metadata, TeamMember } from '../entities/Project';

// Payload para crear un nuevo proyecto
export interface CreateProjectPayload {
  name: string;
  description?: string;
  scope?: Scope;
  timeline?: Timeline;
  budget?: Budget;
  location?: Location;
  metadata?: Metadata;
  owner: string;
  team: TeamMember[]; 
}

// Payload para actualizar un proyecto
export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: string;
  scope?: Scope;
  timeline?: Timeline;
  budget?: Budget;
  location?: Location;
  metadata?: Metadata;
}

// Payload para agregar miembro al equipo
export interface AddTeamMemberPayload {
  userId: string; 
  role: string; 
  permissions: string[];
}

// Interfaz del repositorio de proyectos - define las operaciones de persistencia
export interface IProjectRepository {
  create(payload: CreateProjectPayload): Promise<ProjectEntity>;
  findById(id: string): Promise<ProjectEntity | null>;
  findByUser(userId: string): Promise<ProjectEntity[]>;
  update(id: string, payload: UpdateProjectPayload): Promise<ProjectEntity>;
  delete(id: string): Promise<void>;
  addTeamMember(projectId: string, member: AddTeamMemberPayload): Promise<ProjectEntity>;
  removeTeamMember(projectId: string, userId: string): Promise<ProjectEntity>;
}

export default IProjectRepository;
