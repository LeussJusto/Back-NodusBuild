import mongoose, { Schema, Document } from 'mongoose';

export interface IIncidentDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: string;
  priority: string;
  status: string;
  assignedTo?: mongoose.Types.ObjectId;
  evidence: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncidentDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, default: 'otro' },
    priority: { type: String, default: 'media' },
    status: { type: String, default: 'open' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    evidence: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id ? (ret._id.toString ? ret._id.toString() : ret._id) : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id ? (ret._id.toString ? ret._id.toString() : ret._id) : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

incidentSchema.index({ projectId: 1, status: 1, createdAt: -1 });

export const IncidentModel = mongoose.model<IIncidentDocument>('Incident', incidentSchema);
