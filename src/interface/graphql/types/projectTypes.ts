// Tipos TypeScript para GraphQL

// TeamMember
export interface TeamMemberGQL {
  user: any; 
  role: string;
  permissions: string[];
}

// Scope
export interface ScopeGQL {
  objectives?: string[];
  deliverables?: string[];
  notes?: string;
}

// Timeline
export interface TimelineGQL {
  startDate?: string; 
  endDate?: string;
  estimatedDuration?: number;
}

// Budget
export interface BudgetGQL {
  total?: number;
  spent?: number;
  currency?: string;
}

// Location
export interface LocationGQL {
  address?: string;
  coordinates?: number[];
}

// Metadata
export interface MetadataGQL {
  projectType?: string;
  constructionType?: string;
  area?: number;
  floors?: number;
}

// Project
export interface ProjectGQL {
  id: string;
  name: string;
  description?: string;
  status: string;
  scope?: ScopeGQL;
  owner: any;
  team: TeamMemberGQL[];
  timeline?: TimelineGQL;
  budget?: BudgetGQL;
  location?: LocationGQL;
  metadata?: MetadataGQL;
  createdAt?: string;
  updatedAt?: string;
}

// Input: Crear proyecto
export interface CreateProjectInputGQL {
  name: string;
  description?: string;
  scope?: ScopeGQL;
  timeline?: TimelineGQL;
  budget?: BudgetGQL;
  location?: LocationGQL;
  metadata?: MetadataGQL;
}

// Input: Actualizar proyecto
export interface UpdateProjectInputGQL {
  name?: string;
  description?: string;
  status?: string;
  scope?: ScopeGQL;
  timeline?: TimelineGQL;
  budget?: BudgetGQL;
  location?: LocationGQL;
  metadata?: MetadataGQL;
}

// Input: Agregar miembro al equipo
export interface AddTeamMemberInputGQL {
  userId?: string;
  email?: string;
  role: string;
  permissions: string[];
}
