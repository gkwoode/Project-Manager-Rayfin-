import type { ProjectRecord, TaskRecord } from '@rayfin-app/shared';
import { describe, expect, it } from 'vitest';

import { initials, nameFromEmail, uniqueNames } from './people';
import {
  compareProjects,
  compareTasks,
  portfolioStats,
  progressOf,
  upcomingDeadlines,
} from './portfolio';

const createdAt = new Date('2026-09-01T00:00:00Z');

function task(overrides: Partial<TaskRecord>): TaskRecord {
  return {
    id: overrides.id ?? 't',
    title: 'Task',
    status: 'todo',
    priority: 'medium',
    legacy: false,
    project_id: 'p-1',
    createdAt,
    ...overrides,
  };
}

function project(overrides: Partial<ProjectRecord>): ProjectRecord {
  return {
    id: overrides.id ?? 'p',
    name: 'Project',
    status: 'active',
    archived: false,
    legacy: false,
    createdAt,
    ...overrides,
  };
}

describe('progress', () => {
  it('counts done tasks and rounds the percentage', () => {
    expect(
      progressOf([
        task({ status: 'done' }),
        task({ status: 'review' }),
        task({ status: 'todo' }),
      ])
    ).toEqual({ total: 3, done: 1, open: 2, percent: 33 });
  });

  it('reports zero for a project without tasks', () => {
    expect(progressOf([])).toEqual({ total: 0, done: 0, open: 0, percent: 0 });
  });
});

describe('portfolio stats', () => {
  const today = '2026-10-25';

  it('counts open, overdue, and due-this-week tasks, ignoring done work', () => {
    const stats = portfolioStats(
      [project({ status: 'active' }), project({ status: 'completed' })],
      [
        task({ dueDate: new Date('2026-10-20T00:00:00Z') }),
        task({ dueDate: new Date('2026-10-20T00:00:00Z'), status: 'done' }),
        task({ dueDate: new Date('2026-10-25T00:00:00Z') }),
        task({ dueDate: new Date('2026-11-01T00:00:00Z') }),
        task({ dueDate: new Date('2026-11-02T00:00:00Z') }),
        task({}),
      ],
      today
    );
    expect(stats).toEqual({
      totalProjects: 2,
      activeProjects: 1,
      openTasks: 5,
      overdueTasks: 1,
      dueThisWeek: 2,
    });
  });

  it('lists open deadlines soonest first', () => {
    const list = upcomingDeadlines(
      [
        task({ id: 'later', dueDate: new Date('2026-11-09T00:00:00Z') }),
        task({ id: 'none' }),
        task({ id: 'done', status: 'done', dueDate: new Date('2026-10-01T00:00:00Z') }),
        task({ id: 'late', dueDate: new Date('2026-10-02T00:00:00Z') }),
      ],
      5
    );
    expect(list.map((t) => t.id)).toEqual(['late', 'later']);
  });
});

describe('ordering', () => {
  it('puts urgent work first, then the earliest due date', () => {
    const sorted = [
      task({ id: 'low', priority: 'low' }),
      task({ id: 'urgent-late', priority: 'urgent', dueDate: new Date('2026-12-01T00:00:00Z') }),
      task({ id: 'urgent-soon', priority: 'urgent', dueDate: new Date('2026-11-01T00:00:00Z') }),
    ].sort(compareTasks);
    expect(sorted.map((t) => t.id)).toEqual(['urgent-soon', 'urgent-late', 'low']);
  });

  it('lists live projects before completed ones, alphabetically', () => {
    const sorted = [
      project({ id: 'c', name: 'Archive', status: 'completed' }),
      project({ id: 'b', name: 'beta', status: 'active' }),
      project({ id: 'a', name: 'Alpha', status: 'active' }),
      project({ id: 'p', name: 'Pilot', status: 'planning' }),
    ].sort(compareProjects);
    expect(sorted.map((p) => p.id)).toEqual(['a', 'b', 'p', 'c']);
  });
});

describe('people', () => {
  it('derives a display name and initials from a sign-in email', () => {
    expect(nameFromEmail('ada.obi@reliance.example')).toBe('Ada Obi');
    expect(nameFromEmail(undefined)).toBe('');
    expect(initials('Ada Obi')).toBe('AO');
    expect(initials('Tunde')).toBe('T');
  });

  it('suggests each name once', () => {
    expect(uniqueNames(['Ada', 'ada ', null, '', 'Bola'])).toEqual(['Ada', 'Bola']);
  });
});
