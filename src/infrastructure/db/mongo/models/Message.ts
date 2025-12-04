import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  from: mongoose.Types.ObjectId;
  to?: mongoose.Types.ObjectId | null;
  text?: string | null;
  attachments: Array<{ url: string; type?: string; filename?: string }>; 
  type?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String },
    filename: { type: String },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    attachments: [attachmentSchema],
    type: { type: String, default: 'text' },
    status: { type: String, default: 'sent' },
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

MessageSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
