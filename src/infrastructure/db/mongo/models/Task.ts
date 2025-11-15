import mongoose, { Schema, Document } from 'mongoose';
import { TaskStatus, TaskPriority, ChecklistItem } from '../../../../domain/entities/Task';

//subdocumento: Elemento de checklist
export interface ITaskDocument extends Document {
  project: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  plannedDate?: Date;
  actualDate?: Date;
  status: TaskStatus;
  priority: TaskPriority;
  checklist: ChecklistItem[];
  dependencies: mongoose.Types.ObjectId[];
  ppcWeek?: number;
  createdAt: Date;
  updatedAt: Date;
}

const checklistItemSchema = new Schema<ChecklistItem>(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false } 
);

// Task schema
const taskSchema = new Schema<ITaskDocument>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true, 
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plannedDate: {
      type: Date,
    },
    actualDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDIENTE,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIA,
      required: true,
    },
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
    dependencies: {
      type: [Schema.Types.ObjectId],
      ref: 'Task',
      default: [],
    },
    ppcWeek: {
      type: Number,
      min: 1,
    },
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

// Indices para consultas eficientes
taskSchema.index({ project: 1, status: 1 }); 
taskSchema.index({ assignedTo: 1 }); 
taskSchema.index({ createdBy: 1 }); 

export const TaskModel = mongoose.model<ITaskDocument>('Task', taskSchema);
