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
    throw new Error('Invalid email');
  }

  if (!password || password.length < minPasswordLength) {
    throw new Error(`Password must be at least ${minPasswordLength} characters`);
  }

  if (requireDigit && !/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }
}
