import type {
  ProjectRecord,
  ProjectStatus,
  TaskRecord,
} from '@rayfin-app/shared';

import { addDaysYmd, toDate, toYmd } from './dates';
import { priorityLevel } from './labels';

export interface Progress {
  total: number;
  done: number;
  open: number;
  /** Whole percent done, 0 when there are no tasks. */
  percent: number;
}

export function progressOf(tasks: readonly TaskRecord[]): Progress {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  return {
    total,
    done,
    open: total - done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function groupByProject(
  tasks: readonly TaskRecord[]
): Map<string, TaskRecord[]> {
  const map = new Map<string, TaskRecord[]>();
  for (const task of tasks) {
    const list = map.get(task.project_id);
    if (list) list.push(task);
    else map.set(task.project_id, [task]);
  }
  return map;
}

export interface PortfolioStats {
  totalProjects: number;
  activeProjects: number;
  openTasks: number;
  overdueTasks: number;
  dueThisWeek: number;
}

export function portfolioStats(
  projects: readonly ProjectRecord[],
  tasks: readonly TaskRecord[],
  today: string
): PortfolioStats {
  const weekEnd = addDaysYmd(today, 7);
  let openTasks = 0;
  let overdueTasks = 0;
  let dueThisWeek = 0;

  for (const task of tasks) {
    if (task.status === 'done') continue;
    openTasks += 1;
    const due = toYmd(task.dueDate);
    if (!due) continue;
    if (due < today) overdueTasks += 1;
    else if (due <= weekEnd) dueThisWeek += 1;
  }

  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    openTasks,
    overdueTasks,
    dueThisWeek,
  };
}

/** Open tasks with a due date, soonest (most overdue) first. */
export function upcomingDeadlines(
  tasks: readonly TaskRecord[],
  limit: number
): TaskRecord[] {
  return tasks
    .filter((t) => t.status !== 'done' && toYmd(t.dueDate) !== null)
    .sort((a, b) => {
      const byDue = toYmd(a.dueDate)!.localeCompare(toYmd(b.dueDate)!);
      return byDue !== 0 ? byDue : priorityLevel(b.priority) - priorityLevel(a.priority);
    })
    .slice(0, limit);
}

/**
 * Order within a board column: most urgent first, then the earliest due date,
 * then the oldest card, so the order is stable across reloads.
 */
export function compareTasks(a: TaskRecord, b: TaskRecord): number {
  const byPriority = priorityLevel(b.priority) - priorityLevel(a.priority);
  if (byPriority !== 0) return byPriority;
  const aDue = toYmd(a.dueDate) ?? '9999-12-31';
  const bDue = toYmd(b.dueDate) ?? '9999-12-31';
  if (aDue !== bDue) return aDue.localeCompare(bDue);
  return (
    (toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0)
  );
}

const STATUS_ORDER: Record<ProjectStatus, number> = {
  active: 0,
  planning: 1,
  'on-hold': 2,
  completed: 3,
};

/** Live work first, completed projects last, alphabetical within each. */
export function compareProjects(a: ProjectRecord, b: ProjectRecord): number {
  const byStatus =
    (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
  if (byStatus !== 0) return byStatus;
  return (a.name ?? '').localeCompare(b.name ?? '', undefined, {
    sensitivity: 'base',
  });
}
