export interface ChecklistItemGQL {
  title: string;
  completed: boolean;
}

export interface TaskGQL {
  id: string;
  project: any;
  title: string;
  description?: string | null;
  assignedTo?: any | null;
  createdBy: any;
  plannedDate?: string | null;
  actualDate?: string | null;
  status: string;
  priority: string;
  checklist: ChecklistItemGQL[];
  dependencies: TaskGQL[];
  ppcWeek?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateTaskInputGQL {
  project: string;
  title: string;
  description?: string;
  assignedTo?: string;
  plannedDate?: string;
  status?: string;
  priority?: string;
  checklist?: ChecklistItemGQL[];
  dependencies?: string[];
  ppcWeek?: number;
}

export interface UpdateTaskInputGQL {
  title?: string;
  description?: string;
  assignedTo?: string;
  plannedDate?: string;
  actualDate?: string;
  status?: string;
  priority?: string;
  checklist?: ChecklistItemGQL[];
  dependencies?: string[];
  ppcWeek?: number;
}

