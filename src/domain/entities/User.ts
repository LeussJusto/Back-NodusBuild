export interface Profile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface UserEntity {
  id: string;
  email: string;
  profile?: Profile;
  role?: string;
  isActive?: boolean;
}
