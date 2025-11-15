import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface IUser extends Document {
  email: string;
  password: string;
  profile: IUserProfile;
  isActive: boolean;
  role: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, required: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Email no válido'] },
    password: { type: String, required: true, minlength: 5 },
    profile: {
      firstName: { type: String },
      lastName: { type: String },
      phone: { type: String },
      avatar: { type: String, default: '/uploads/avatars/default.png' },
    },
    isActive: { type: Boolean, default: true },
    role: { type: String, default: 'user' },
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

// Hash de la contraseña antes de guardar (solo si fue modificada)
UserSchema.pre('save', async function (next) {
  // @ts-ignore
  if (!this.isModified('password')) return next();
  // @ts-ignore
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar contraseñas durante el login
UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

export const UserModel = mongoose.model<IUser>('User', UserSchema);
export default UserModel;
