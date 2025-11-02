import { UserModel, IUser } from '../models/User';
import { IUserRepository, CreateUserPayload } from '../../../../domain/repositories/IUserRepository';
import { UserEntity } from '../../../../domain/entities/User';

function mapDocToEntity(doc: IUser): UserEntity {
  const id = (doc._id as any).toString();
  return {
    id,
    email: doc.email,
    profile: doc.profile || {},
    role: doc.role,
    isActive: doc.isActive,
  };
}

export class UserRepository implements IUserRepository {
  async create(payload: CreateUserPayload) {
    const user = new UserModel({
      email: payload.email,
      password: payload.password,
      profile: payload.profile || {},
    } as any);
    const saved = await user.save();
    return mapDocToEntity(saved);
  }

  async findByEmail(email: string) {
    const doc = await UserModel.findOne({ email }).exec();
    if (!doc) return null;
    return mapDocToEntity(doc);
  }

  async findById(id: string) {
    const doc = await UserModel.findById(id).exec();
    if (!doc) return null;
    return mapDocToEntity(doc);
  }

  async verifyCredentials(email: string, candidate: string) {
    const doc = await UserModel.findOne({ email }).exec();
    if (!doc) return null;
    const valid = await doc.comparePassword(candidate);
    if (!valid) return null;
    return mapDocToEntity(doc);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const doc = await UserModel.findById(userId).exec();
    if (!doc) throw new Error('User not found');
    doc.profile = doc.profile || {};
    doc.profile.avatar = avatarUrl;
    const saved = await doc.save();
    return mapDocToEntity(saved);
  }
}

export default new UserRepository();
