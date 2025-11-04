// DTO para el registro de usuarios
export interface RegisterDTO {
  email: string;
  password: string;
  profile?: {//Información opcional del perfil
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

// DTO para el inicio de sesión
export interface LoginDTO {
  email: string;
  password: string;
}
