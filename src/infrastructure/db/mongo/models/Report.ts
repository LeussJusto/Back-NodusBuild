import mongoose, { Schema, Document } from 'mongoose';
import { ReportType, ReportStatus, ReportChecklistItem } from '../../../../domain/entities/Report';

// Subdocumento: Ítem de checklist
const reportChecklistItemSchema = new Schema<ReportChecklistItem>(
  {
    item: { type: String, required: true },
    completed: { type: Boolean, default: false },
    evidenceId: { type: String }, 
  },
  { _id: false }
);

// Interface para revisor en Mongo (usa ObjectId)
interface IReportReviewer {
  user: mongoose.Types.ObjectId;
  approved?: boolean;
  reviewedAt?: Date;
  feedback?: string;
}

// Subdocumento: Revisor
const reportReviewerSchema = new Schema<IReportReviewer>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approved: { type: Boolean },
    reviewedAt: { type: Date },
    feedback: { type: String },
  },
  { _id: false }
);

// Interface del documento principal de Report
export interface IReportDocument extends Document {
  project: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  type: ReportType;
  date: Date;
  relatedTasks: mongoose.Types.ObjectId[];
  content?: string;
  checklist: ReportChecklistItem[];
  status: ReportStatus;
  reviewers: IReportReviewer[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Report schema
const reportSchema = new Schema<IReportDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    relatedTasks: {
      type: [Schema.Types.ObjectId],
      ref: 'Task',
      default: [],
    },
    content: {
      type: String,
      trim: true,
    },
    checklist: {
      type: [reportChecklistItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.DRAFT,
      required: true,
    },
    reviewers: {
      type: [reportReviewerSchema],
      default: [],
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas eficientes
reportSchema.index({ project: 1, createdAt: -1 });
reportSchema.index({ project: 1, type: 1, status: 1, date: -1 }); 
reportSchema.index({ createdBy: 1, type: 1, date: -1 }); 

export const ReportModel = mongoose.model<IReportDocument>('Report', reportSchema);
