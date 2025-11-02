export interface RegisterDTO {
  email: string;
  password: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface LoginDTO {
  email: string;
  password: string;
}
