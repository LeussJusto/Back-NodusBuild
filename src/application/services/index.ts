import UserRepository from '../../infrastructure/db/mongo/repositories/UserRepository';
import AuthService from './authService';

// Composition root for simple wiring: instantiate concrete repos and pass to services.
const authService = new AuthService(UserRepository);

export { authService };
export default authService;
