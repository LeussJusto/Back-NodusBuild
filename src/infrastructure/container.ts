import UserRepository from './db/mongo/repositories/UserRepository';
import ProjectRepository from './db/mongo/repositories/ProjectRepository';
import TaskRepository from './db/mongo/repositories/TaskRepository';
import ReportRepository from './db/mongo/repositories/ReportRepository';
import AuthService from '../application/services/authService';
import ProjectService from '../application/services/ProjectService';
import { TaskService } from '../application/services/TaskService';
import { ReportService } from '../application/services/ReportService';

// Inicializa el servicio de autenticación con el repositorio de MongoDB
export const authService = new AuthService(UserRepository);

// Inicializa el servicio de proyectos con los repositorios necesarios
export const projectService = new ProjectService(ProjectRepository, UserRepository);

// Inicializa el servicio de tareas con los repositorios necesarios
export const taskService = new TaskService(TaskRepository, ProjectRepository);

// Inicializa el servicio de reportes con los repositorios necesarios
export const reportService = new ReportService(ReportRepository, ProjectRepository, TaskRepository);

export default authService;
