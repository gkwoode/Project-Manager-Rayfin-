import type {
  ContributorRecord,
  ProjectRecord,
  TaskRecord,
  UserRecord,
} from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import {
  canEditTask,
  canManage,
  contributorsOf,
  findUserByEmail,
  findUserByName,
  isEmail,
  isUnclaimed,
  leadershipOf,
  normalizeEmail,
  roleOn,
  sameLeadership,
  teamOf,
} from './access';

const createdAt = new Date('2026-09-01T00:00:00Z');

const people: UserRecord[] = [
  { id: 'u-amaka', name: 'Amaka Eze', email: 'amaka.eze@reliance.example' },
  { id: 'u-tunde', name: 'Tunde Bello', email: 'tunde.bello@reliance.example' },
  { id: 'u-kemi', name: 'Kemi Adeyemi', email: 'kemi.adeyemi@reliance.example' },
  { id: 'u-intruder', name: 'Intruder', email: 'intruder@reliance.example' },
];
const users = new Map(people.map((u) => [u.id, u]));

const project: ProjectRecord = {
  id: 'p-1',
  name: 'Dynamics 365 rollout',
  status: 'active',
  archived: false,
  legacy: false,
  manager_id: 'u-amaka',
  manager_email: 'amaka.eze@reliance.example',
  lead_id: 'u-tunde',
  lead_email: 'tunde.bello@reliance.example',
  createdAt,
};

function contributor(overrides: Partial<ContributorRecord>): ContributorRecord {
  return {
    id: overrides.id ?? 'c',
    project_id: 'p-1',
    user_id: 'u-kemi',
    manager_email: project.manager_email,
    lead_email: project.lead_email,
    createdAt,
    ...overrides,
  };
}

const task: TaskRecord = {
  id: 't-1',
  title: 'Branch UAT',
  status: 'todo',
  priority: 'high',
  legacy: false,
  assignee_id: 'u-kemi',
  assignee_email: 'kemi.adeyemi@reliance.example',
  project_id: 'p-1',
  createdAt,
};

describe('emails', () => {
  it('compares emails without regard to case or spacing', () => {
    expect(normalizeEmail('  Godwin@Contoso.COM ')).toBe('godwin@contoso.com');
    expect(normalizeEmail(null)).toBe('');
    expect(isEmail('ada@reliance.example')).toBe(true);
    expect(isEmail('ada@reliance')).toBe(false);
    expect(findUserByEmail(people, 'KEMI.adeyemi@reliance.example')?.id).toBe('u-kemi');
  });

  it('copies leadership with empty roles as null', () => {
    expect(leadershipOf({ manager_email: ' A@X.io ', lead_email: '' })).toEqual({
      manager_email: 'a@x.io',
      lead_email: null,
    });
    expect(
      sameLeadership({ manager_email: 'A@x.io', lead_email: null }, { manager_email: 'a@x.io' })
    ).toBe(true);
  });
});

describe('records from before roles', () => {
  it('links an old free-text name only when exactly one person has it', () => {
    expect(findUserByName(people, '  kemi   ADEYEMI ')?.id).toBe('u-kemi');
    expect(findUserByName(people, 'Nobody')).toBeUndefined();
    const twins = [...people, { id: 'u-kemi-2', name: 'Kemi Adeyemi', email: 'k2@reliance.example' }];
    expect(findUserByName(twins, 'Kemi Adeyemi')).toBeUndefined();
  });

  it('treats a legacy project as unclaimed', () => {
    expect(isUnclaimed({ ...project, legacy: true })).toBe(true);
    expect(isUnclaimed(project)).toBe(false);
  });
});

describe('team membership', () => {
  it("ignores team rows that were not written by the project's leadership", () => {
    const real = contributor({ id: 'real' });
    const forged = contributor({
      id: 'forged',
      user_id: 'u-intruder',
      manager_email: 'intruder@reliance.example',
    });
    const otherProject = contributor({ id: 'other', project_id: 'p-2' });
    expect(contributorsOf(project, [real, forged, otherProject]).map((c) => c.id)).toEqual([
      'real',
    ]);
  });

  it('gives each person their highest role', () => {
    const team = contributorsOf(project, [contributor({})]);
    expect(roleOn(project, team, users, 'Amaka.Eze@reliance.example')).toBe('manager');
    expect(roleOn(project, team, users, 'tunde.bello@reliance.example')).toBe('lead');
    expect(roleOn(project, team, users, 'kemi.adeyemi@reliance.example')).toBe('contributor');
    expect(roleOn(project, team, users, 'someone.else@reliance.example')).toBeNull();
    expect(roleOn(project, team, users, '')).toBeNull();
  });

  it('lists the manager, lead, then contributors, each once, with directory names', () => {
    const team = teamOf(
      project,
      [contributor({}), contributor({ id: 'dup', user_id: 'u-amaka' })],
      users
    );
    expect(team.map((m) => [m.name, m.role, m.contributor?.id ?? null])).toEqual([
      ['Amaka Eze', 'manager', null],
      ['Tunde Bello', 'lead', null],
      ['Kemi Adeyemi', 'contributor', 'c'],
    ]);
  });

  it('works with only a manager or only a lead', () => {
    const leadOnly = { ...project, manager_id: null, manager_email: null };
    expect(teamOf(leadOnly, [], users).map((m) => m.role)).toEqual(['lead']);
  });

  it('falls back to the copied email when someone is missing from the directory', () => {
    const team = teamOf(project, [], new Map());
    expect(team[0]).toMatchObject({ name: 'amaka.eze@reliance.example', role: 'manager' });
  });
});

describe('permissions', () => {
  it('lets managers and leads manage, and contributors change only their own tasks', () => {
    expect(canManage('manager')).toBe(true);
    expect(canManage('lead')).toBe(true);
    expect(canManage('contributor')).toBe(false);
    expect(canManage(null)).toBe(false);

    expect(canEditTask(task, 'manager', 'amaka.eze@reliance.example')).toBe(true);
    expect(canEditTask(task, 'contributor', 'kemi.adeyemi@reliance.example')).toBe(true);
    expect(canEditTask(task, 'contributor', 'bola@reliance.example')).toBe(false);
  });
});
