import mongoose, { Schema, Document } from 'mongoose';

export interface IEventDocument extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEventDocument>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    status: { type: String, required: true, default: 'pendiente' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id ? (ret._id.toString ? ret._id.toString() : ret._id) : ret.id; delete ret._id; delete ret.__v; return ret; } },
    toObject: { virtuals: true, transform: (_doc: any, ret: any) => { ret.id = ret._id ? (ret._id.toString ? ret._id.toString() : ret._id) : ret.id; delete ret._id; delete ret.__v; return ret; } },
  }
);

export const EventModel = mongoose.model<IEventDocument>('Event', eventSchema);
