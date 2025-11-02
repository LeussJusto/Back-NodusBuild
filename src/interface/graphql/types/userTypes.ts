export interface ProfileGQL {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatar?: string | null;
}

export interface UserGQL {
  id: string;
  email: string;
  profile?: ProfileGQL | null;
  role?: string | null;
  isActive?: boolean | null;
}

export interface AuthPayloadGQL {
  token: string;
  user: UserGQL;
}

export interface RegisterInputGQL {
  email: string;
  password: string;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
}

export interface LoginInputGQL {
  email: string;
  password: string;
}

export type MeQueryResult = UserGQL | null;
