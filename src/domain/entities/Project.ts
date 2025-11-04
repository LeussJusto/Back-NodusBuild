// Roles disponibles en un proyecto (en español)
export enum ProjectRole {
  INGENIERO_RESIDENTE = 'ingeniero_residente', 
  INGENIERO_PRODUCCION = 'ingeniero_produccion',
  INGENIERO_CALIDAD = 'ingeniero_calidad',
  INGENIERO_ESPECIALIDADES = 'ingeniero_especialidades',
  INGENIERO_ACABADOS = 'ingeniero_acabados',
  ADMINISTRADOR_OBRA = 'administrador_obra',
  ALMACENERO = 'almacenero',
}

// Estados del proyecto
export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Miembro del equipo del proyecto
export interface TeamMember {
  user: string; 
  role: ProjectRole;
  permissions: string[];
}

// Alcance del proyecto
export interface Scope {
  objectives?: string[];
  deliverables?: string[];
  notes?: string;
}

// Línea de tiempo del proyecto
export interface Timeline {
  startDate?: Date;
  endDate?: Date;
  estimatedDuration?: number; 
}

// Presupuesto del proyecto
export interface Budget {
  total?: number;
  spent?: number;
  currency?: string;
}

// Ubicación del proyecto
export interface Location {
  address?: string;
  coordinates?: number[]; 
}

// Metadata adicional del proyecto
export interface Metadata {
  projectType?: string;
  constructionType?: string;
  area?: number;
  floors?: number;
}

// Entidad principal de Proyecto
export interface ProjectEntity {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  scope?: Scope;
  owner: string; 
  team: TeamMember[];
  timeline?: Timeline;
  budget?: Budget;
  location?: Location;
  metadata?: Metadata;
  createdAt?: Date;
  updatedAt?: Date;
}
