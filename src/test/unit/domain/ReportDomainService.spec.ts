import {
  isProjectMember,
  canCreateDaily,
  canCreateGeneral,
  canUpdateDaily,
  canUpdateGeneral,
  canDeleteDaily,
  canDeleteGeneral,
  canModerateDaily,
  canModerateGeneral,
  canSubmitForReview,
  validateStatusTransition,
  ensureRelatedTasksBelongToProject,
  isTaskAssignee,
} from '../../../domain/services/ReportDomainService';
import { ProjectEntity, ProjectRole, ProjectStatus } from '../../../domain/entities/Project';
import { Report, ReportType, ReportStatus } from '../../../domain/entities/Report';

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

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'r1',
    project: 'p1',
    createdBy: 'u2',
    type: ReportType.DAILY,
    date: new Date(),
    relatedTasks: [],
    content: 'Contenido',
    checklist: [],
    status: ReportStatus.DRAFT,
    reviewers: [],
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('Domain/ReportDomainService', () => {
  describe('isProjectMember', () => {
    it('returns true for owner', () => {
      const p = makeProject({ owner: 'owner1' });
      expect(isProjectMember('owner1', p)).toBe(true);
    });

    it('returns true for team members', () => {
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

  describe('canCreateDaily', () => {
    it('returns true for any project member', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.ALMACENERO, permissions: [] },
      ] });
      expect(canCreateDaily('u1', p)).toBe(true);
      expect(canCreateDaily('u2', p)).toBe(true);
    });

    it('returns false for non-members', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      expect(canCreateDaily('uX', p)).toBe(false);
    });
  });

  describe('canCreateGeneral', () => {
    it('returns true for assignee of the task', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      expect(canCreateGeneral('u2', p, 'u2')).toBe(true);
    });

    it('returns false for non-assignee', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      expect(canCreateGeneral('u2', p, 'u1')).toBe(false);
    });

    it('returns false for non-members', () => {
      const p = makeProject({ team: [
        { user: 'u1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      expect(canCreateGeneral('uX', p, 'uX')).toBe(false);
    });
  });

  describe('canUpdateDaily', () => {
    it('returns true for author in draft', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canUpdateDaily('u2', r)).toBe(true);
    });

    it('returns true for author in rejected', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.REJECTED });
      expect(canUpdateDaily('u2', r)).toBe(true);
    });

    it('returns false for author in in_review', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.IN_REVIEW });
      expect(canUpdateDaily('u2', r)).toBe(false);
    });

    it('returns false for author in approved', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.APPROVED });
      expect(canUpdateDaily('u2', r)).toBe(false);
    });

    it('returns false for non-author', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canUpdateDaily('u3', r)).toBe(false);
    });

    it('returns false for general type', () => {
      const r = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canUpdateDaily('u2', r)).toBe(false);
    });
  });

  describe('canUpdateGeneral', () => {
    it('returns true for author in draft', () => {
      const r = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canUpdateGeneral('u2', r)).toBe(true);
    });

    it('returns false for author in rejected', () => {
      const r = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.REJECTED });
      expect(canUpdateGeneral('u2', r)).toBe(false);
    });

    it('returns false for non-author', () => {
      const r = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canUpdateGeneral('u3', r)).toBe(false);
    });

    it('returns false for daily type', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canUpdateGeneral('u2', r)).toBe(false);
    });
  });

  describe('canDeleteDaily', () => {
    it('returns true for author in draft', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canDeleteDaily('u2', r)).toBe(true);
    });

    it('returns true for author in rejected', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.REJECTED });
      expect(canDeleteDaily('u2', r)).toBe(true);
    });

    it('returns false for author in approved', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.APPROVED });
      expect(canDeleteDaily('u2', r)).toBe(false);
    });

    it('returns false for non-author', () => {
      const r = makeReport({ type: ReportType.DAILY, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canDeleteDaily('u3', r)).toBe(false);
    });
  });

  describe('canDeleteGeneral', () => {
    it('returns true for author in draft', () => {
      const r = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canDeleteGeneral('u2', r)).toBe(true);
    });

    it('returns false for author in rejected', () => {
      const r = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.REJECTED });
      expect(canDeleteGeneral('u2', r)).toBe(false);
    });

    it('returns false for non-author', () => {
      const r = makeReport({ type: ReportType.GENERAL, createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canDeleteGeneral('u3', r)).toBe(false);
    });
  });

  describe('canModerateDaily', () => {
    it('returns true for residente when report is in_review', () => {
      const p = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      const r = makeReport({ type: ReportType.DAILY, status: ReportStatus.IN_REVIEW });
      expect(canModerateDaily('owner1', p, r)).toBe(true);
    });

    it('returns false for residente when report is draft', () => {
      const p = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      const r = makeReport({ type: ReportType.DAILY, status: ReportStatus.DRAFT });
      expect(canModerateDaily('owner1', p, r)).toBe(false);
    });

    it('returns false for non-residente', () => {
      const p = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      const r = makeReport({ type: ReportType.DAILY, status: ReportStatus.IN_REVIEW });
      expect(canModerateDaily('u2', p, r)).toBe(false);
    });

    it('returns false for general type', () => {
      const p = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
      ] });
      const r = makeReport({ type: ReportType.GENERAL, status: ReportStatus.IN_REVIEW });
      expect(canModerateDaily('owner1', p, r)).toBe(false);
    });
  });

  describe('canModerateGeneral', () => {
    it('returns true for residente when report is in_review', () => {
      const p = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      const r = makeReport({ type: ReportType.GENERAL, status: ReportStatus.IN_REVIEW });
      expect(canModerateGeneral('owner1', p, r)).toBe(true);
    });

    it('returns false for non-residente', () => {
      const p = makeProject({ team: [
        { user: 'owner1', role: ProjectRole.INGENIERO_RESIDENTE, permissions: [] },
        { user: 'u2', role: ProjectRole.INGENIERO_CALIDAD, permissions: [] },
      ] });
      const r = makeReport({ type: ReportType.GENERAL, status: ReportStatus.IN_REVIEW });
      expect(canModerateGeneral('u2', p, r)).toBe(false);
    });
  });

  describe('canSubmitForReview', () => {
    it('returns true for author in draft', () => {
      const r = makeReport({ createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canSubmitForReview('u2', r)).toBe(true);
    });

    it('returns false for author not in draft', () => {
      const r = makeReport({ createdBy: 'u2', status: ReportStatus.IN_REVIEW });
      expect(canSubmitForReview('u2', r)).toBe(false);
    });

    it('returns false for non-author', () => {
      const r = makeReport({ createdBy: 'u2', status: ReportStatus.DRAFT });
      expect(canSubmitForReview('u3', r)).toBe(false);
    });
  });

  describe('validateStatusTransition', () => {
    it('allows draft to in_review', () => {
      expect(() => validateStatusTransition(ReportStatus.DRAFT, ReportStatus.IN_REVIEW)).not.toThrow();
    });

    it('allows in_review to approved', () => {
      expect(() => validateStatusTransition(ReportStatus.IN_REVIEW, ReportStatus.APPROVED)).not.toThrow();
    });

    it('allows in_review to rejected', () => {
      expect(() => validateStatusTransition(ReportStatus.IN_REVIEW, ReportStatus.REJECTED)).not.toThrow();
    });

    it('throws on invalid transitions', () => {
      expect(() => validateStatusTransition(ReportStatus.DRAFT, ReportStatus.APPROVED)).toThrow('Transición de estado inválida');
      expect(() => validateStatusTransition(ReportStatus.APPROVED, ReportStatus.DRAFT)).toThrow('Transición de estado inválida');
      expect(() => validateStatusTransition(ReportStatus.REJECTED, ReportStatus.APPROVED)).toThrow('Transición de estado inválida');
    });
  });

  describe('ensureRelatedTasksBelongToProject', () => {
    it('does not throw when all tasks belong to project', () => {
      expect(() => ensureRelatedTasksBelongToProject(['p1', 'p1', 'p1'], 'p1')).not.toThrow();
    });

    it('throws when any task does not belong to project', () => {
      expect(() => ensureRelatedTasksBelongToProject(['p1', 'p2', 'p1'], 'p1')).toThrow('Una o más tareas no pertenecen al proyecto');
    });
  });

  describe('isTaskAssignee', () => {
    it('returns true when user is assignee', () => {
      expect(isTaskAssignee('u2', 'u2')).toBe(true);
    });

    it('returns false when user is not assignee', () => {
      expect(isTaskAssignee('u2', 'u3')).toBe(false);
    });

    it('returns false when no assignee', () => {
      expect(isTaskAssignee('u2', undefined)).toBe(false);
    });
  });
});
