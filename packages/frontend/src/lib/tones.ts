import type { ProjectStatus, TaskStatus } from '@rayfin-app/shared';

export interface Tone {
  dot: string;
  text: string;
  bg: string;
}

const PROJECT_TONE: Record<ProjectStatus, Tone> = {
  planning: { dot: 'bg-info', text: 'text-info', bg: 'bg-info/10' },
  active: { dot: 'bg-primary', text: 'text-brand-foreground', bg: 'bg-primary/10' },
  'on-hold': { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning/10' },
  completed: { dot: 'bg-success', text: 'text-success', bg: 'bg-success/10' },
};

export function projectTone(status: unknown): Tone {
  return PROJECT_TONE[status as ProjectStatus] ?? PROJECT_TONE.planning;
}

const TASK_DOT: Record<TaskStatus, string> = {
  todo: 'bg-muted-foreground',
  'in-progress': 'bg-info',
  review: 'bg-warning',
  done: 'bg-success',
};

export function taskStatusDot(status: unknown): string {
  return TASK_DOT[status as TaskStatus] ?? TASK_DOT.todo;
}
