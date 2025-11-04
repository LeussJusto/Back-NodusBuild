import { isOwner, canAccess, ensureOwnerCanModify, ensureNotRemovingOwner } from '../../../domain/services/ProjectDomainService';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';

function makeProject(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    id: 'p1',
    name: 'Proyecto A',
    status: ProjectStatus.PLANNING,
    owner: 'owner1',
    team: [
      { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
    ],
    ...overrides,
  } as ProjectEntity;
}

describe('Domain/ProjectDomainService', () => {
  it('isOwner returns true for owner and false otherwise', () => {
    const p = makeProject({ owner: 'u1' });
    expect(isOwner(p, 'u1')).toBe(true);
    expect(isOwner(p, 'u2')).toBe(false);
  });

  it('canAccess returns true for owner', () => {
    const p = makeProject({ owner: 'u1' });
    expect(canAccess(p, 'u1')).toBe(true);
  });

  it('canAccess returns true for team member and false for outsiders', () => {
    const p = makeProject({ owner: 'u1', team: [
      { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
    ] });
    expect(canAccess(p, 'u2')).toBe(true);
    expect(canAccess(p, 'uX')).toBe(false);
  });

  it('ensureOwnerCanModify does not throw for owner, throws otherwise', () => {
    const p = makeProject({ owner: 'u1' });
    expect(() => ensureOwnerCanModify(p, 'u1')).not.toThrow();
    expect(() => ensureOwnerCanModify(p, 'u2')).toThrow('Solo el creador del proyecto puede realizar esta acción');
  });

  it('ensureNotRemovingOwner throws when trying to remove owner, not otherwise', () => {
    const p = makeProject({ owner: 'u1' });
    expect(() => ensureNotRemovingOwner(p, 'u1')).toThrow('No puedes quitar al creador del proyecto');
    expect(() => ensureNotRemovingOwner(p, 'u2')).not.toThrow();
  });
});
