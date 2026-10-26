import type {
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@rayfin-app/shared';

export const PROJECT_STATUSES: readonly {
  value: ProjectStatus;
  label: string;
}[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on-hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
];

/** Board columns, left to right. */
export const TASK_STATUSES: readonly { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export const TASK_PRIORITIES: readonly {
  value: TaskPriority;
  label: string;
  level: number;
}[] = [
  { value: 'low', label: 'Low', level: 1 },
  { value: 'medium', label: 'Medium', level: 2 },
  { value: 'high', label: 'High', level: 3 },
  { value: 'urgent', label: 'Urgent', level: 4 },
];

function labelOf<T extends string>(
  options: readonly { value: T; label: string }[],
  value: unknown
): string {
  return options.find((o) => o.value === value)?.label ?? 'Unknown';
}

export const projectStatusLabel = (value: unknown) =>
  labelOf(PROJECT_STATUSES, value);
export const taskStatusLabel = (value: unknown) =>
  labelOf(TASK_STATUSES, value);
export const priorityLabel = (value: unknown) =>
  labelOf(TASK_PRIORITIES, value);

export function priorityLevel(value: unknown): number {
  return TASK_PRIORITIES.find((p) => p.value === value)?.level ?? 0;
}
