import UserRepository from './db/mongo/repositories/UserRepository';
import ProjectRepository from './db/mongo/repositories/ProjectRepository';
import TaskRepository from './db/mongo/repositories/TaskRepository';
import ReportRepository from './db/mongo/repositories/ReportRepository';
import DocumentRepository from './db/mongo/repositories/DocumentRepository';
import NotificationRepository from './db/mongo/repositories/NotificationRepository';
import AuthService from '../application/services/authService';
import ProjectService from '../application/services/ProjectService';
import { TaskService } from '../application/services/TaskService';
import { ReportService } from '../application/services/ReportService';
import { DocumentService } from '../application/services/DocumentService';
import { NotificationService } from '../application/services/NotificationService';
import LocalFileStorageService from './storage/LocalFileStorageService';

// Inicializa el servicio de autenticación con el repositorio de MongoDB
export const authService = new AuthService(UserRepository);

// Servicio de documentos y almacenamiento de archivos
const fileStorage = new LocalFileStorageService({
	// uploadDir y publicBasePath pueden configurarse aquí si es necesario
});
export const documentService = new DocumentService(DocumentRepository, ReportRepository, fileStorage);

// Inicializa el servicio de notificaciones con el repositorio necesario
export const notificationService = new NotificationService(NotificationRepository);

// Inicializa el servicio de proyectos con los repositorios necesarios
export const projectService = new ProjectService(ProjectRepository, UserRepository, notificationService);

// Inicializa el servicio de tareas con los repositorios necesarios
export const taskService = new TaskService(TaskRepository, ProjectRepository, notificationService);

// Inicializa el servicio de reportes con los repositorios necesarios
export const reportService = new ReportService(ReportRepository, ProjectRepository, TaskRepository, notificationService);

export default authService;
