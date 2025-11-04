import {
  isProjectMember,
  canCreateTask,
  canUpdateTask,
  canDeleteTask,
  ensureAssignedToIsProjectMember,
} from '../../../domain/services/TaskDomainService';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';

function makeProject(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'p1',
    name: 'Proyecto A',
    status: ProjectStatus.PLANNING,
    owner: 'owner1',
    team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
    ],
    ...overrides,
  } as ProjectEntity;
}

describe('Domain/TaskDomainService', () => {
  describe('isProjectMember', () => {
    it('returns true for project members', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      expect(isProjectMember('u1', p)).toBe(true);
      expect(isProjectMember('u2', p)).toBe(true);
    });

    it('returns false for non-members', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      expect(isProjectMember('uX', p)).toBe(false);
    });
  });

  describe('canCreateTask', () => {
    it('returns true for any project member', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.ALMACENERO, permissions: [] },
      ] });
      expect(canCreateTask('u1', p)).toBe(true);
      expect(canCreateTask('u2', p)).toBe(true);
    });

    it('returns false for non-members', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      expect(canCreateTask('uX', p)).toBe(false);
    });
  });

  describe('canUpdateTask', () => {
    it('returns true for project owner', () => {
      const p = makeProject({ owner: 'owner1' });
      expect(canUpdateTask('owner1', p, 'u2', 'u3')).toBe(true);
    });

    it('returns true for ingeniero_residente', () => {
      const p = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      expect(canUpdateTask('u2', p, 'u3', 'u4')).toBe(true);
    });

    it('returns true for task creator', () => {
      const p = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      expect(canUpdateTask('u2', p, 'u2', 'u3')).toBe(true);
    });

    it('returns true for assigned user', () => {
      const p = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      expect(canUpdateTask('u2', p, 'u1', 'u2')).toBe(true);
    });

    it('returns false for other team members', () => {
      const p = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
        { user: 'u3', role: ProjectRole.ALMACENERO, permissions: [] },
      ] });
      expect(canUpdateTask('u3', p, 'u1', 'u2')).toBe(false);
    });

    it('returns false for non-members', () => {
      const p = makeProject({ owner: 'owner1' });
      expect(canUpdateTask('uX', p, 'owner1', undefined)).toBe(false);
    });
  });

  describe('canDeleteTask', () => {
    it('returns true for project owner', () => {
      const p = makeProject({ owner: 'owner1' });
      expect(canDeleteTask('owner1', p, 'u2')).toBe(true);
    });

    it('returns true for ingeniero_residente', () => {
      const p = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      expect(canDeleteTask('u2', p, 'u3')).toBe(true);
    });

    it('returns true for task creator', () => {
      const p = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      expect(canDeleteTask('u2', p, 'u2')).toBe(true);
    });

    it('returns false for other team members', () => {
      const p = makeProject({ owner: 'owner1', team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
        { user: 'u3', role: ProjectRole.ALMACENERO, permissions: [] },
      ] });
      expect(canDeleteTask('u3', p, 'u2')).toBe(false);
    });

    it('returns false for non-members', () => {
      const p = makeProject({ owner: 'owner1' });
      expect(canDeleteTask('uX', p, 'owner1')).toBe(false);
    });
  });

  describe('ensureAssignedToIsProjectMember', () => {
    it('does not throw when assignedTo is project member', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      expect(() => ensureAssignedToIsProjectMember('u2', p)).not.toThrow();
    });

    it('throws when assignedTo is not project member', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      expect(() => ensureAssignedToIsProjectMember('uX', p)).toThrow('El usuario asignado debe ser miembro del proyecto');
    });

    it('does not throw when assignedTo is undefined', () => {
      const p = makeProject();
      expect(() => ensureAssignedToIsProjectMember(undefined, p)).not.toThrow();
    });
  });
});
