import { ApolloServer } from '@apollo/server';
import projectSchemaDefinition from '../../../interface/graphql/schema/projectSchema';
import userSchemaDefinition from '../../../interface/graphql/schema/userSchema';

// Helper project mock
const project = {
  id: 'p1',
  name: 'Proyecto A',
  description: 'Desc',
  status: 'planning',
  owner: 'owner1',
  team: [],
};

// Build server with real typeDefs/resolvers
const server = new ApolloServer({
  typeDefs: [userSchemaDefinition.typeDefs, projectSchemaDefinition.typeDefs],
  resolvers: [userSchemaDefinition.resolvers, projectSchemaDefinition.resolvers],
});

describe('Integration/GraphQL project resolvers', () => {
  const mockService = {
    getMyProjects: jest.fn().mockResolvedValue([project]),
    getProjectById: jest.fn().mockResolvedValue(project),
    createProject: jest.fn().mockResolvedValue(project),
    updateProject: jest.fn().mockResolvedValue({ ...project, name: 'Updated' }),
    deleteProject: jest.fn().mockResolvedValue(true),
    addTeamMember: jest.fn().mockResolvedValue({ ...project, team: [{ user: 'u2', role: 'ingeniero_calidad', permissions: [] }] }),
    removeTeamMember: jest.fn().mockResolvedValue(project),
  } as any;

  const authCtx = { user: { id: 'u1' }, projectService: mockService };

  it('myProjects returns list for authenticated user', async () => {
    const res = await server.executeOperation(
      { query: `query { myProjects { id name status } }` },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.myProjects[0].id).toBe('p1');
    expect(mockService.getMyProjects).toHaveBeenCalledWith('u1');
  });

  it('project returns a project by id when authorized', async () => {
    const res = await server.executeOperation(
      { query: `query($id: ID!){ project(id:$id){ id name status } }`, variables: { id: 'p1' } },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.project.id).toBe('p1');
    expect(mockService.getProjectById).toHaveBeenCalledWith('p1', 'u1');
  });

  it('createProject passes parsed timeline and returns project', async () => {
    const res = await server.executeOperation(
      { query: `mutation($input: CreateProjectInput!){ createProject(input:$input){ id name status } }`, variables: { input: { name: 'Proyecto A', timeline: { startDate: '2024-01-01', endDate: '2024-02-01' } } } },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.createProject.id).toBe('p1');
    const callArg = (mockService.createProject as jest.Mock).mock.calls[0][0];
    expect(callArg.name).toBe('Proyecto A');
    expect(callArg.timeline?.startDate instanceof Date).toBe(true);
    expect(callArg.timeline?.endDate instanceof Date).toBe(true);
  });

  it('updateProject passes parsed timeline and returns updated project', async () => {
    const res = await server.executeOperation(
      { query: `mutation($id: ID!, $input: UpdateProjectInput!){ updateProject(id:$id, input:$input){ id name } }`, variables: { id: 'p1', input: { name: 'Updated', timeline: { startDate: '2024-03-01' } } } },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.updateProject.name).toBe('Updated');
    const callArg = (mockService.updateProject as jest.Mock).mock.calls[0][1];
    expect(callArg.timeline?.startDate instanceof Date).toBe(true);
    expect((mockService.updateProject as jest.Mock).mock.calls[0][2]).toBe('u1');
  });

  it('deleteProject returns true', async () => {
    const res = await server.executeOperation(
      { query: `mutation($id: ID!){ deleteProject(id:$id) }`, variables: { id: 'p1' } },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.deleteProject).toBe(true);
    expect(mockService.deleteProject).toHaveBeenCalledWith('p1', 'u1');
  });

  it('addTeamMember calls service and returns project', async () => {
    const res = await server.executeOperation(
      { query: `mutation($pid: ID!, $input: AddTeamMemberInput!){ addTeamMember(projectId:$pid, input:$input){ id name } }`, variables: { pid: 'p1', input: { userId: 'u2', role: 'ingeniero_calidad', permissions: [] } } },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.addTeamMember.id).toBe('p1');
    expect(mockService.addTeamMember).toHaveBeenCalledWith('p1', { userId: 'u2', role: 'ingeniero_calidad', permissions: [] }, 'u1');
  });

  it('removeTeamMember calls service and returns project', async () => {
    const res = await server.executeOperation(
      { query: `mutation($pid: ID!, $uid: ID!){ removeTeamMember(projectId:$pid, userId:$uid){ id name } }`, variables: { pid: 'p1', uid: 'u2' } },
      { contextValue: authCtx }
    );
    expect(res.body.kind).toBe('single');
    const data: any = (res.body as any).singleResult.data;
    expect(data.removeTeamMember.id).toBe('p1');
    expect(mockService.removeTeamMember).toHaveBeenCalledWith('p1', 'u2', 'u1');
  });
});
