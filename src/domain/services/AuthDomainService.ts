// Configuración de reglas para validación de registro
export interface RegistrationRules {
  minPasswordLength?: number; 
  requireDigit?: boolean; 
}

// Valida email y contraseña según las reglas de negocio
export function ensureValidRegistration(
  email: string,
  password: string,
  rules: RegistrationRules = {}
): void {
  const { minPasswordLength = 6, requireDigit = true } = rules;

  if (!email || !email.includes('@')) {
    throw new Error('Email inválido');
  }

  if (!password || password.length < minPasswordLength) {
    throw new Error(`La contraseña debe tener al menos ${minPasswordLength} caracteres`);
  }

  if (requireDigit && !/[0-9]/.test(password)) {
    throw new Error('La contraseña debe contener al menos un número');
  }
}
