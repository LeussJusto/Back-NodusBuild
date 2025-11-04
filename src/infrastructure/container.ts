import UserRepository from './db/mongo/repositories/UserRepository';
import AuthService from '../application/services/authService';

// Inicializa el servicio de autenticación con el repositorio de MongoDB
export const authService = new AuthService(UserRepository);

export default authService;
