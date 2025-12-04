export interface EventGQL {
  id: string;
  project: any;
  title: string;
  description?: string;
  date: string; // ISO
  status: string;
  createdBy: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEventInputGQL {
  projectId: string;
  title: string;
  description?: string;
  date: string;
  status?: string;
}

export interface UpdateEventInputGQL {
  title?: string;
  description?: string;
  date?: string;
  status?: string;
}
