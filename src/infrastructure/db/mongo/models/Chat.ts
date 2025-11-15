import mongoose, { Schema, Document } from 'mongoose';

// Subdocumento: Participante del chat
export interface IChatParticipant {
  userId: mongoose.Types.ObjectId;
  role: string;
  joinedAt: Date;
  lastReadAt?: Date;
}

const chatParticipantSchema = new Schema<IChatParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['admin', 'member'],
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date },
  },
  { _id: false }
);

// Interface del documento principal de Chat
export interface IChat extends Document {
  type: string;
  projectId?: mongoose.Types.ObjectId;
  title?: string;
  participants: IChatParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema principal de Chat
const chatSchema = new Schema<IChat>(
  {
    type: {
      type: String,
      enum: ['direct', 'project', 'group'],
      required: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    title: { type: String, trim: true },
    participants: [chatParticipantSchema],
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

// Índices para búsquedas eficientes
chatSchema.index({ 'participants.userId': 1 });
chatSchema.index({ projectId: 1 });
chatSchema.index({ type: 1 });

// Índice compuesto para búsqueda de chats directos por par de usuarios
chatSchema.index({ type: 1, 'participants.userId': 1 });

export default mongoose.model<IChat>('Chat', chatSchema);
