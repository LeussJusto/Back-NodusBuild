import IncidentRepository from '../../infrastructure/db/mongo/repositories/IncidentRepository';
import { CreateIncidentInput, UpdateIncidentInput } from '../dto/incidentDTO';
import { Incident } from '../../domain/entities/Incident';
import ProjectService from './ProjectService';

export class IncidentService {
  constructor(private incidentRepository: any, private projectService: ProjectService) {}

  async createIncident(input: CreateIncidentInput, userId: string): Promise<Incident> {
    // validate project and membership
    await this.projectService.getProjectById(input.projectId, userId);

    const payload = {
      taskId: input.taskId,
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      type: input.type || 'otro',
      priority: input.priority || 'media',
      evidence: input.evidence || [],
      createdBy: userId,
    } as any;

    return this.incidentRepository.create(payload);
  }

  async getIncidentById(id: string, userId: string): Promise<Incident> {
    const inc = await this.incidentRepository.findById(id);
    if (!inc) throw new Error('Incidencia no encontrada');
    // check membership
    await this.projectService.getProjectById(inc.projectId, userId);
    return inc;
  }

  async getIncidentsByProject(projectId: string, userId: string): Promise<Incident[]> {
    await this.projectService.getProjectById(projectId, userId);
    return this.incidentRepository.findByProject(projectId);
  }

  async getIncidentsForUser(userId: string): Promise<Incident[]> {
    const projects = await this.projectService.getMyProjects(userId);
    const ids = projects.map((p) => p.id);
    return this.incidentRepository.findByProjects(ids);
  }

  async updateIncident(id: string, input: UpdateIncidentInput, userId: string): Promise<Incident> {
    const existing = await this.incidentRepository.findById(id);
    if (!existing) throw new Error('Incidencia no encontrada');
    // only creator or project resident can edit
    const project = await this.projectService.getProjectById(existing.projectId, userId);
    if (existing.createdBy !== userId) {
      // simple check: if not creator, ensure is resident/owner via projectService (will throw if not)
      await this.projectService.getProjectById(existing.projectId, userId);
    }
    const updated = await this.incidentRepository.update(id, input);
    if (!updated) throw new Error('No se pudo actualizar la incidencia');
    return updated;
  }

  async deleteIncident(id: string, userId: string): Promise<boolean> {
    const existing = await this.incidentRepository.findById(id);
    if (!existing) throw new Error('Incidencia no encontrada');
    if (existing.createdBy !== userId) throw new Error('No tienes permiso para eliminar esta incidencia');
    return this.incidentRepository.delete(id);
  }
}

export default IncidentService;
