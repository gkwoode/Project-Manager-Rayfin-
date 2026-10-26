import type { ProjectRecord, ProjectRole, TaskRecord } from '@rayfin-app/shared';
import { CalendarCheck2, FolderPlus, History, Library, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Avatar,
  DueChip,
  PriorityMark,
  ProjectStatusBadge,
  RoleBadge,
} from '@/components/badges';
import { EmptyState } from '@/components/states';
import { Button, CapsuleMeter, Eyebrow } from '@/components/ui';
import { isPending } from '@/components/useCrud';
import type { UsersById } from '@/lib/access';
import { dueState, formatDueDate } from '@/lib/dates';
import { greeting } from '@/lib/people';
import {
  portfolioStats,
  progressOf,
  upcomingDeadlines,
} from '@/lib/portfolio';
import { cn } from '@/lib/utils';

const todayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/**
 * The signed-in person's own work: the projects they are on, and the tasks
 * they are responsible for — everything on projects they manage or lead,
 * plus whatever is assigned to them elsewhere.
 */
export function Overview({
  projects,
  tasks,
  tasksByProject,
  roles,
  users,
  today,
  userName,
  unclaimedCount,
  onOpenProject,
  onOpenTask,
  onNewProject,
  onBrowse,
}: {
  /** Projects from before roles that nobody has claimed yet. */
  unclaimedCount: number;
  /** Active (not archived) projects the person has a role on. */
  projects: readonly ProjectRecord[];
  /** Tasks the person is responsible for on those projects. */
  tasks: readonly TaskRecord[];
  /** Every task, by project, for whole-project progress. */
  tasksByProject: ReadonlyMap<string, readonly TaskRecord[]>;
  roles: ReadonlyMap<string, ProjectRole | null>;
  users: UsersById;
  today: string;
  userName: string;
  onOpenProject(id: string): void;
  onOpenTask(task: TaskRecord): void;
  onNewProject(): void;
  onBrowse(): void;
}) {
  const stats = portfolioStats(projects, tasks, today);
  const deadlines = upcomingDeadlines(tasks, 8);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const firstName = userName.split(' ')[0];
  const doneTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="flex flex-col gap-800">
      <header className="flex flex-wrap items-end justify-between gap-400">
        <div>
          <Eyebrow className="text-brand-foreground">
            {todayFormatter.format(new Date())}
          </Eyebrow>
          <h1 className="mt-200 text-hero-900 leading-hero-900 font-semibold tracking-tight">
            Portfolio
          </h1>
          <p className="mt-100 text-400 leading-400 text-muted-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}. Here's where your projects
            stand today.
          </p>
        </div>
        <Button onClick={onNewProject}>
          <Plus aria-hidden="true" className="icon-size-200" />
          New project
        </Button>
      </header>

      {unclaimedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-300 rounded-xl border border-warning/40 bg-warning/10 px-400 py-300">
          <History aria-hidden="true" className="icon-size-200 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-300 leading-300">
            <strong className="font-semibold">
              {unclaimedCount} {unclaimedCount === 1 ? 'project needs' : 'projects need'} a
              manager.
            </strong>{' '}
            {unclaimedCount === 1 ? 'It was' : 'They were'} created before roles
            existed — claim yours to bring {unclaimedCount === 1 ? 'its' : 'their'}{' '}
            tasks across.
          </p>
          <Button size="sm" variant="secondary" onClick={onBrowse}>
            Review projects
          </Button>
        </div>
      ) : null}

      <section
        aria-label="Portfolio summary"
        className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-4"
      >
        <Stat
          label="Active projects"
          value={stats.activeProjects}
          caption={`of ${stats.totalProjects} you're on`}
          className="border-r border-b lg:border-b-0"
        />
        <Stat
          label="Open tasks"
          value={stats.openTasks}
          caption={`${doneTasks} completed`}
          className="border-b lg:border-r lg:border-b-0"
        />
        <Stat
          label="Overdue"
          value={stats.overdueTasks}
          caption="past their due date"
          emphasis={stats.overdueTasks > 0}
          className="border-r"
        />
        <Stat
          label="Due in 7 days"
          value={stats.dueThisWeek}
          caption="open tasks coming up"
        />
      </section>

      <div className="grid gap-800 xl:grid-cols-3">
        <section aria-labelledby="projects-heading" className="xl:col-span-2">
          <SectionHeading id="projects-heading" count={projects.length}>
            Your projects
          </SectionHeading>
          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderPlus className="icon-size-600" />}
              title="You're not on any projects yet"
              hint="Create a project you'll manage or lead, or browse the directory to find your team's."
              action={
                <div className="flex flex-wrap justify-center gap-200">
                  <Button onClick={onNewProject}>
                    <Plus aria-hidden="true" className="icon-size-200" />
                    New project
                  </Button>
                  <Button variant="secondary" onClick={onBrowse}>
                    <Library aria-hidden="true" className="icon-size-200" />
                    Browse all projects
                  </Button>
                </div>
              }
            />
          ) : (
            <ul className="grid gap-400 md:grid-cols-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard
                    project={project}
                    users={users}
                    role={roles.get(project.id) ?? null}
                    tasks={tasksByProject.get(project.id) ?? []}
                    today={today}
                    onOpen={() => onOpenProject(project.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="deadlines-heading">
          <SectionHeading id="deadlines-heading" count={deadlines.length}>
            Upcoming deadlines
          </SectionHeading>
          {deadlines.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck2 className="icon-size-600" />}
              title="Nothing due"
              hint="Open tasks with a due date appear here, most urgent first."
            />
          ) : (
            <ol className="overflow-hidden rounded-2xl border border-border bg-card">
              {deadlines.map((task) => (
                <li key={task.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    disabled={isPending(task)}
                    onClick={() => onOpenTask(task)}
                    className="flex w-full items-start gap-300 px-400 py-300 text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-300 leading-300 font-medium">
                        {task.title}
                      </p>
                      <p className="mt-100-nudge truncate text-200 leading-200 text-muted-foreground">
                        {projectName.get(task.project_id) ?? 'Project'}
                      </p>
                      <div className="mt-200-nudge flex items-center gap-300">
                        <DueChip value={task.dueDate} today={today} />
                        <PriorityMark priority={task.priority} />
                      </div>
                    </div>
                    <Avatar
                      name={
                        task.assignee_id
                          ? (users.get(task.assignee_id)?.name ?? task.assignee_email)
                          : null
                      }
                    />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  count,
  children,
}: {
  id: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="mb-400 flex items-baseline gap-200">
      <h2 id={id} className="text-500 leading-500 font-semibold">
        {children}
      </h2>
      <span className="font-numeric text-300 leading-300 text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  emphasis = false,
  className,
}: {
  label: string;
  value: number;
  caption: string;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-100 border-border p-500', className)}>
      <Eyebrow className="text-muted-foreground">{label}</Eyebrow>
      <p
        className={cn(
          'font-heading text-[length:var(--text-hero-900)] leading-hero-900 font-semibold tabular-nums',
          emphasis ? 'text-brand-foreground' : 'text-card-foreground'
        )}
      >
        {value}
      </p>
      <p className="text-200 leading-200 text-muted-foreground">{caption}</p>
    </div>
  );
}

function ProjectCard({
  project,
  users,
  role,
  tasks,
  today,
  onOpen,
}: {
  project: ProjectRecord;
  users: UsersById;
  role: ProjectRole | null;
  tasks: readonly TaskRecord[];
  today: string;
  onOpen(): void;
}) {
  const progress = progressOf(tasks);
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && dueState(t.dueDate, today) === 'overdue'
  ).length;
  const managerName = project.manager_id
    ? (users.get(project.manager_id)?.name ?? project.manager_email)
    : null;
  const leadName = project.lead_id
    ? (users.get(project.lead_id)?.name ?? project.lead_email)
    : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isPending(project)}
      className="group flex h-full w-full flex-col gap-400 rounded-2xl border border-border bg-card p-500 text-left transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
    >
      <div className="flex items-start justify-between gap-300">
        <div className="min-w-0">
          <Eyebrow className="truncate text-muted-foreground">
            {project.client || 'Internal'}
          </Eyebrow>
          <h3 className="mt-100 text-500 leading-500 font-semibold text-card-foreground group-hover:text-brand-foreground">
            {project.name}
          </h3>
        </div>
        <ProjectStatusBadge status={project.status} className="shrink-0" />
      </div>

      <dl className="grid grid-cols-3 gap-300 text-200 leading-200">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Manager</dt>
          <dd className="mt-100-nudge truncate font-medium text-card-foreground">
            {managerName || '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Lead</dt>
          <dd className="mt-100-nudge truncate font-medium text-card-foreground">
            {leadName || '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Target</dt>
          <dd className="mt-100-nudge truncate font-numeric font-medium text-card-foreground">
            {project.dueDate ? formatDueDate(project.dueDate, 'short') : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-200">
        <CapsuleMeter
          done={progress.done}
          total={progress.total}
          label={`${project.name} progress`}
        />
        <div className="flex items-center justify-between gap-200 text-200 leading-200">
          <span className="text-muted-foreground">
            {progress.total === 0
              ? 'No tasks yet'
              : `${progress.done} of ${progress.total} tasks done`}
            {overdue > 0 ? (
              <span className="font-semibold text-destructive">
                {' '}
                · {overdue} overdue
              </span>
            ) : null}
          </span>
          {role ? <RoleBadge role={role} /> : null}
        </div>
      </div>
    </button>
  );
}
