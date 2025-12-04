export interface CreateIncidentInput {
  projectId: string;
  taskId?: string;
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  evidence?: string[]; // URLs
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  evidence?: string[];
}

export default {};
