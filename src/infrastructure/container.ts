import UserRepository from './db/mongo/repositories/UserRepository';
import ProjectRepository from './db/mongo/repositories/ProjectRepository';
import AuthService from '../application/services/authService';
import ProjectService from '../application/services/ProjectService';

// Inicializa el servicio de autenticación con el repositorio de MongoDB
export const authService = new AuthService(UserRepository);

// Inicializa el servicio de proyectos con los repositorios necesarios
export const projectService = new ProjectService(ProjectRepository, UserRepository);

export default authService;
