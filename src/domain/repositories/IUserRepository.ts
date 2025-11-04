import { UserEntity } from '../entities/User';

// Payload para crear un nuevo usuario
export interface CreateUserPayload {
  email: string;
  password: string;
  profile?: { firstName?: string; lastName?: string; phone?: string };
}

// Interfaz del repositorio de usuarios - define las operaciones de persistencia
export interface IUserRepository {
  create(payload: CreateUserPayload): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  verifyCredentials(email: string, candidate: string): Promise<UserEntity | null>;
  updateAvatar(userId: string, avatarUrl: string): Promise<UserEntity>;
}

export default IUserRepository;
