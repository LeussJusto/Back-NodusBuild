import { ApolloServer } from '@apollo/server';
import taskSchemaDefinition from '../../../interface/graphql/schema/taskSchema';
import projectSchemaDefinition from '../../../interface/graphql/schema/projectSchema';
import userSchemaDefinition from '../../../interface/graphql/schema/userSchema';

// Helper task mock
const task = {
  id: 't1',
  project: 'p1',
  title: 'Tarea A',
  description: 'Descripción',
  status: 'pendiente',
  priority: 'media',
  createdBy: 'u1',
  checklist: [],
  dependencies: [],
};

const server = new ApolloServer({
  typeDefs: [
    userSchemaDefinition.typeDefs,
    projectSchemaDefinition.typeDefs,
    taskSchemaDefinition.typeDefs,
  ],
  resolvers: [
    userSchemaDefinition.resolvers,
    projectSchemaDefinition.resolvers,
    taskSchemaDefinition.resolvers,
  ],
});

describe('Integration/GraphQL task resolvers', () => {
  const mockService = {
    createTask: jest.fn().mockResolvedValue(task),
    getTaskById: jest.fn().mockResolvedValue(task),
    getTasksByProject: jest.fn().mockResolvedValue([task]),
    updateTask: jest.fn().mockResolvedValue({ ...task, title: 'Updated' }),
    deleteTask: jest.fn().mockResolvedValue(true),
  } as any;

  const authCtx = { user: { id: 'u1' }, taskService: mockService };

  it('task returns a task by id when authorized', async () => {
    const res = await server.executeOperation(
      {
        query: `query($id: ID!){ task(id:$id){ id title status priority } }`,
        variables: { id: 't1' },
      },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.task.id).toBe('t1');
    expect(mockService.getTaskById).toHaveBeenCalledWith('t1', 'u1');
  });

  it('tasksByProject returns list of tasks when authorized', async () => {
    const res = await server.executeOperation(
      {
        query: `query($projectId: ID!){ tasksByProject(projectId:$projectId){ id title status } }`,
        variables: { projectId: 'p1' },
      },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.tasksByProject[0].id).toBe('t1');
    expect(mockService.getTasksByProject).toHaveBeenCalledWith('p1', 'u1');
  });

  it('createTask validates input and returns task', async () => {
    const res = await server.executeOperation(
      {
        query: `mutation($input: CreateTaskInput!){ createTask(input:$input){ id title status priority } }`,
        variables: {
          input: {
            project: 'p1',
            title: 'Nueva tarea',
            description: 'Descripción',
            status: 'pendiente',
            priority: 'alta',
          },
        },
      },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.createTask.id).toBe('t1');
    expect(mockService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        project: 'p1',
        title: 'Nueva tarea',
        status: 'pendiente',
        priority: 'alta',
      }),
      'u1'
    );
  });

  it('createTask rejects invalid status', async () => {
    const res = await server.executeOperation(
      {
        query: `mutation($input: CreateTaskInput!){ createTask(input:$input){ id title } }`,
        variables: {
          input: {
            project: 'p1',
            title: 'Tarea',
            status: 'invalid_status',
          },
        },
      },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const result: any = res.body as any;
    expect(result.singleResult.errors).toBeDefined();
  });

  it('updateTask validates input and returns updated task', async () => {
    const res = await server.executeOperation(
      {
        query: `mutation($id: ID!, $input: UpdateTaskInput!){ updateTask(id:$id, input:$input){ id title status } }`,
        variables: {
          id: 't1',
          input: {
            title: 'Updated',
            status: 'en_progreso',
          },
        },
      },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.updateTask.title).toBe('Updated');
    expect(mockService.updateTask).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        title: 'Updated',
        status: 'en_progreso',
      }),
      'u1'
    );
  });

  it('deleteTask returns true when successful', async () => {
    const res = await server.executeOperation(
      {
        query: `mutation($id: ID!){ deleteTask(id:$id) }`,
        variables: { id: 't1' },
      },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.deleteTask).toBe(true);
    expect(mockService.deleteTask).toHaveBeenCalledWith('t1', 'u1');
  });
});
