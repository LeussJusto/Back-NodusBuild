export type IncidentType = 'calidad' | 'seguridad' | 'operativo' | 'otro';
export type IncidentPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Incident {
  id: string;
  taskId?: string;
  projectId: string;
  title: string;
  description?: string;
  type: IncidentType;
  priority: IncidentPriority;
  status: IncidentStatus;
  assignedTo?: string;
  evidence: string[]; // URLs
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_INCIDENT_PRIORITY: IncidentPriority = 'media';
export const DEFAULT_INCIDENT_TYPE: IncidentType = 'otro';
export const DEFAULT_INCIDENT_STATUS: IncidentStatus = 'open';

export default Incident;
