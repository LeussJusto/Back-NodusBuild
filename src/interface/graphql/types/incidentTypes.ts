export interface IncidentGQL {
  id: string;
  project: any;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  assignedTo?: any;
  evidence: string[];
  createdBy: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIncidentInputGQL {
  projectId: string;
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  evidenceFiles?: any[]; // Uploads
}

export interface UpdateIncidentInputGQL {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  evidence?: string[];
}
