// Entidad de perfil de usuario
export interface Profile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

// Entidad principal de usuario
export interface UserEntity {
  id: string;
  email: string;
  profile?: Profile;
  role?: string;
  isActive?: boolean;
}
