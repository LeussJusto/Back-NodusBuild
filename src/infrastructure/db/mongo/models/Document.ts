import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';
import { DocumentEntityType } from '../../../../domain/entities/Document';

// Interface del documento principal de Document en Mongo
export interface IDocumentMongo extends MongooseDocument {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  relatedTo?: {
    entityType: DocumentEntityType | string; 
    entityId: mongoose.Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const relatedToSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['report', 'task', 'project'],
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
  },
  { _id: false }
);

const documentSchema = new Schema<IDocumentMongo>(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    relatedTo: { type: relatedToSchema, required: false },
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

// Índices compuestos útiles
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1, createdAt: -1 });

export const DocumentModel = mongoose.model<IDocumentMongo>('Document', documentSchema);
