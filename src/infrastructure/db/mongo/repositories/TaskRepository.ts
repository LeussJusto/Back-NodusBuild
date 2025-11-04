import { 
  ITaskRepository, 
  CreateTaskPayload, 
  UpdateTaskPayload 
} from '../../../../domain/repositories/ITaskRepository';
import { Task } from '../../../../domain/entities/Task';
import { TaskModel } from '../models/Task';

class TaskRepository implements ITaskRepository {
  async create(payload: CreateTaskPayload): Promise<Task> {
    //Crea una nueva tarea en la base de datos
    const newTask = await TaskModel.create(payload);
    return this.mapToEntity(newTask);
  }

  //Buscar tarea por ID con populate
  async findById(id: string): Promise<Task | null> {
    const task = await TaskModel.findById(id)
      .populate('project', 'name')
      .populate('assignedTo', 'email profile')
      .populate('createdBy', 'email profile')
      .populate('dependencies', 'title status')
      .exec();

    return task ? this.mapToEntity(task) : null;
  }

  //Buscar todas las tareas de un proyecto con populate
  async findByProject(projectId: string): Promise<Task[]> {
    const tasks = await TaskModel.find({ project: projectId })
      .populate('assignedTo', 'email profile')
      .populate('createdBy', 'email profile')
      .populate('dependencies', 'title status')
      .sort({ createdAt: -1 })
      .exec();

    return tasks.map((task) => this.mapToEntity(task));
  }

  //Actualizar tarea
  async update(id: string, payload: UpdateTaskPayload): Promise<Task | null> {
    const updatedTask = await TaskModel.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    )
      .populate('project', 'name')
      .populate('assignedTo', 'email profile')
      .populate('createdBy', 'email profile')
      .populate('dependencies', 'title status')
      .exec();

    return updatedTask ? this.mapToEntity(updatedTask) : null;
  }

  //Eliminar tarea
  async delete(id: string): Promise<boolean> {
    const result = await TaskModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
  //Mapea el documento de Mongoose a la entidad de dominio
  private mapToEntity(doc: any): Task {
    return {
      id: doc._id.toString(),
      project: doc.project?._id?.toString() || doc.project?.toString(),
      title: doc.title,
      description: doc.description,
      assignedTo: doc.assignedTo?._id?.toString() || doc.assignedTo?.toString(),
      createdBy: doc.createdBy?._id?.toString() || doc.createdBy?.toString(),
      plannedDate: doc.plannedDate,
      actualDate: doc.actualDate,
      status: doc.status,
      priority: doc.priority,
      checklist: doc.checklist || [],
      dependencies: doc.dependencies?.map((dep: any) => 
        dep?._id?.toString() || dep?.toString()
      ) || [],
      ppcWeek: doc.ppcWeek,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

export default new TaskRepository();
