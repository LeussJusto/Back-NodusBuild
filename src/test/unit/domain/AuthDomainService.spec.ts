import { ensureValidRegistration } from '../../../domain/services/AuthDomainService';

describe('Domain/AuthDomainService.ensureValidRegistration', () => {
  it('throws on invalid email', () => {
    expect(() => ensureValidRegistration('not-an-email', 'abc123')).toThrow('Invalid email');
  });

  it('throws when password shorter than min length', () => {
    expect(() => ensureValidRegistration('a@b.com', '123', { minPasswordLength: 6 })).toThrow(
      'Password must be at least 6 characters' // Valida longitud mínima configurable
    );
  });

  it('throws when password has no digit', () => {
    expect(() => ensureValidRegistration('a@b.com', 'abcdef')).toThrow(
      'Password must contain at least one number' // Valida complejidad de contraseña
    );
  });

  it('passes for valid email and password', () => {
    expect(() => ensureValidRegistration('user@mail.com', 'abc123')).not.toThrow(); // Caso de éxito
  });
});
