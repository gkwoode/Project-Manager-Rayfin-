import type { ProjectRole } from '@rayfin-app/shared';
import { CalendarClock } from 'lucide-react';

import { ROLE_LABEL } from '@/lib/access';
import { describeDue, dueState, formatDueDate } from '@/lib/dates';
import {
  priorityLabel,
  priorityLevel,
  projectStatusLabel,
} from '@/lib/labels';
import { initials } from '@/lib/people';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: unknown;
  className?: string;
}) {
  const tone = projectTone(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-200-nudge rounded-full px-200 py-100-nudge text-[length:var(--text-200)] leading-200 font-semibold',
        tone.bg,
        tone.text,
        className
      )}
    >
      <span aria-hidden="true" className={cn('size-200-nudge rounded-full', tone.dot)} />
      {projectStatusLabel(status)}
    </span>
  );
}

const ROLE_STYLE: Record<ProjectRole, string> = {
  manager: 'bg-primary text-primary-foreground',
  lead: 'border border-primary/60 text-brand-foreground',
  contributor: 'bg-secondary text-secondary-foreground',
};

/** The signed-in person's (or a team member's) role on a project. */
export function RoleBadge({
  role,
  prefix,
  className,
}: {
  role: ProjectRole;
  /** e.g. "You're" — reads "You're Project manager". */
  prefix?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-200 py-100-nudge text-[length:var(--text-100)] leading-100 font-semibold tracking-wider whitespace-nowrap uppercase',
        ROLE_STYLE[role],
        className
      )}
    >
      {prefix ? `${prefix} ` : ''}
      {ROLE_LABEL[role]}
    </span>
  );
}

/** Four small capsules, filled crimson by priority level. */
export function PriorityMark({
  priority,
  className,
}: {
  priority: unknown;
  className?: string;
}) {
  const level = priorityLevel(priority);
  const label = priorityLabel(priority);
  return (
    <span
      className={cn('inline-flex items-center gap-100', className)}
      title={`${label} priority`}
    >
      <span aria-hidden="true" className="inline-flex items-end gap-100-nudge">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'w-100 rounded-full',
              step === 1 && 'h-100',
              step === 2 && 'h-200-nudge',
              step === 3 && 'h-200',
              step === 4 && 'h-300-nudge',
              step <= level ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </span>
      <span className="sr-only">{label} priority</span>
      {level === 4 ? (
        <span
          aria-hidden="true"
          className="text-[length:var(--text-100)] leading-100 font-bold tracking-wider text-brand-foreground uppercase"
        >
          Urgent
        </span>
      ) : null}
    </span>
  );
}

export function DueChip({
  value,
  today,
  done = false,
  className,
}: {
  value: unknown;
  today: string;
  done?: boolean;
  className?: string;
}) {
  const state = dueState(value, today, 3);
  if (state === 'none') return null;
  const tone = done
    ? 'text-muted-foreground'
    : state === 'overdue'
      ? 'text-destructive font-semibold'
      : state === 'today' || state === 'soon'
        ? 'text-warning font-semibold'
        : 'text-muted-foreground';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-100 font-numeric text-[length:var(--text-200)] leading-200',
        tone,
        className
      )}
      title={describeDue(value, today)}
    >
      <CalendarClock aria-hidden="true" className="icon-size-100" />
      <span>{formatDueDate(value, 'short')}</span>
      <span className="sr-only">
        {done ? '' : `, ${describeDue(value, today)}`}
      </span>
    </span>
  );
}

export function Avatar({
  name,
  className,
}: {
  name: unknown;
  className?: string;
}) {
  const text = initials(name);
  if (!text) return null;
  return (
    <span
      title={String(name)}
      className={cn(
        'inline-flex size-600 shrink-0 items-center justify-center rounded-full bg-foreground font-heading text-[length:var(--text-100)] leading-100 font-semibold text-background',
        className
      )}
    >
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">Assigned to {String(name)}</span>
    </span>
  );
}
