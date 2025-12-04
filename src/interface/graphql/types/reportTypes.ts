export interface ReportChecklistItemGQL {
  item: string;
  completed: boolean;
  evidenceId?: string | null;
}

export interface ReportReviewerGQL {
  user: any;
  approved?: boolean | null;
  reviewedAt?: string | null;
  feedback?: string | null;
}

export interface ReportGQL {
  id: string;
  project: any;
  createdBy: any;
  type: string;
  date: string;
  relatedTasks: any[];
  content?: string | null;
  checklist: ReportChecklistItemGQL[];
  status: string;
  reviewers: ReportReviewerGQL[];
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyInputGQL {
  project: string;
  taskId?: string;
  date?: string;
  content?: string;
  checklist?: ReportChecklistItemGQL[];
  attachments?: string[];
  attachmentsFiles?: any[];
}

export interface CreateGeneralInputGQL {
  project: string;
  taskId: string;
  date?: string;
  content?: string;
  checklist?: ReportChecklistItemGQL[];
  attachments?: string[];
}

export interface UpdateReportInputGQL {
  date?: string;
  content?: string;
  checklist?: ReportChecklistItemGQL[];
  attachments?: string[];
}

export interface ApproveReportInputGQL {
  reportId: string;
  feedback?: string;
}

export interface RejectReportInputGQL {
  reportId: string;
  feedback?: string;
}
