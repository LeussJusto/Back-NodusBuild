import mongoose, { Schema, Document } from 'mongoose';

// Subdocumento: Miembro del equipo
export interface ITeamMember {
  user: mongoose.Types.ObjectId;
  role: string;
  permissions: string[];
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: [
        'ingeniero_residente',
        'ingeniero_produccion',
        'ingeniero_calidad',
        'ingeniero_especialidades',
        'ingeniero_acabados',
        'administrador_obra',
        'almacenero',
      ],
      required: true,
    },
    permissions: [{ type: String }],
  },
  { _id: false }
);

// Subdocumento: Alcance
export interface IScope {
  objectives?: string[];
  deliverables?: string[];
  notes?: string;
}

const scopeSchema = new Schema<IScope>(
  {
    objectives: [String],
    deliverables: [String],
    notes: String,
  },
  { _id: false }
);

// Subdocumento: Línea de tiempo
export interface ITimeline {
  startDate?: Date;
  endDate?: Date;
  estimatedDuration?: number;
}

const timelineSchema = new Schema<ITimeline>(
  {
    startDate: Date,
    endDate: Date,
    estimatedDuration: Number, // en días
  },
  { _id: false }
);

// Subdocumento: Presupuesto
export interface IBudget {
  total?: number;
  spent?: number;
  currency?: string;
}

const budgetSchema = new Schema<IBudget>(
  {
    total: { type: Number, min: 0 },
    spent: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'PEN' },
  },
  { _id: false }
);

// Subdocumento: Ubicación
export interface ILocation {
  address?: string;
  coordinates?: number[];
}

const locationSchema = new Schema<ILocation>(
  {
    address: String,
    coordinates: { type: [Number], index: '2dsphere' },
  },
  { _id: false }
);

// Subdocumento: Metadata
export interface IMetadata {
  projectType?: string;
  constructionType?: string;
  area?: number;
  floors?: number;
}

const metadataSchema = new Schema<IMetadata>(
  {
    projectType: String,
    constructionType: String,
    area: Number,
    floors: Number,
  },
  { _id: false }
);

// Interface del documento principal de Proyecto
export interface IProject extends Document {
  name: string;
  description?: string;
  status: string;
  scope?: IScope;
  owner: mongoose.Types.ObjectId;
  team: ITeamMember[];
  timeline?: ITimeline;
  budget?: IBudget;
  location?: ILocation;
  metadata?: IMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Schema principal de Proyecto
const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    status: {
      type: String,
      enum: ['planning', 'active', 'paused', 'completed', 'cancelled'],
      default: 'planning',
    },
    scope: scopeSchema,
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    team: [teamMemberSchema],
    timeline: timelineSchema,
    budget: budgetSchema,
    location: locationSchema,
    metadata: metadataSchema,
  },
  { timestamps: true }
);

// Índices para búsquedas eficientes
projectSchema.index({ owner: 1 });
projectSchema.index({ 'team.user': 1 });

export default mongoose.model<IProject>('Project', projectSchema);
