import { UserEntity } from '../entities/User';

export interface CreateUserPayload {
  email: string;
  password: string;
  profile?: { firstName?: string; lastName?: string; phone?: string };
}

export interface IUserRepository {
  create(payload: CreateUserPayload): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  verifyCredentials(email: string, candidate: string): Promise<UserEntity | null>;
  updateAvatar(userId: string, avatarUrl: string): Promise<UserEntity>;
}

export default IUserRepository;
