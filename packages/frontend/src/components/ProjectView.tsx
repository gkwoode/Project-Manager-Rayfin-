import type {
  ProjectRecord,
  ProjectRole,
  TaskRecord,
  TaskStatus,
} from '@rayfin-app/shared';
import {
  AlignLeft,
  Archive,
  ArchiveRestore,
  EyeOff,
  History,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useId, useState, type DragEvent, type FormEvent } from 'react';

import {
  Avatar,
  DueChip,
  PriorityMark,
  ProjectStatusBadge,
  RoleBadge,
} from '@/components/badges';
import { EmptyState } from '@/components/states';
import { TeamPanel } from '@/components/TeamPanel';
import { Button, CapsuleMeter, Eyebrow, controlClass } from '@/components/ui';
import { isPending, type MutationResult } from '@/components/useCrud';
import {
  canEditTask,
  canManage,
  isUnclaimed,
  type TeamMember,
  type UsersById,
} from '@/lib/access';
import { describeDue, dueState, formatDueDate } from '@/lib/dates';
import { TASK_STATUSES } from '@/lib/labels';
import { compareTasks, progressOf } from '@/lib/portfolio';
import { taskStatusDot } from '@/lib/tones';
import { cn } from '@/lib/utils';

export function ProjectView({
  project,
  role,
  me,
  meUserId,
  team,
  users,
  tasks,
  today,
  onEditProject,
  onClaim,
  onToggleArchive,
  onDeleteProject,
  onAddContributor,
  onRemoveContributor,
  onNewTask,
  onOpenTask,
  onMoveTask,
  onQuickAdd,
}: {
  project: ProjectRecord;
  /** The signed-in person's role here, or `null` when not on the team. */
  role: ProjectRole | null;
  me: string;
  meUserId: string | null;
  team: readonly TeamMember[];
  users: UsersById;
  tasks: readonly TaskRecord[];
  today: string;
  onEditProject(): void;
  /** Claims a project from before roles existed. */
  onClaim(): void;
  onToggleArchive(): void;
  onDeleteProject(): void;
  onAddContributor(): void;
  onRemoveContributor(
    member: TeamMember & { contributor: NonNullable<TeamMember['contributor']> }
  ): void;
  onNewTask(status: TaskStatus): void;
  onOpenTask(task: TaskRecord): void;
  onMoveTask(task: TaskRecord, status: TaskStatus): void;
  onQuickAdd(title: string): Promise<MutationResult<unknown>>;
}) {
  const manages = canManage(role);
  const unclaimed = isUnclaimed(project);
  const archived = project.archived === true;
  const canAddTasks = role !== null && !archived;
  const progress = progressOf(tasks);
  const targetState = dueState(project.dueDate, today, 14);

  return (
    <div className="flex flex-col gap-700">
      <header className="flex flex-col gap-500">
        <div className="flex flex-wrap items-start justify-between gap-400">
          <div className="min-w-0">
            <Eyebrow className="text-brand-foreground">
              {project.client || 'Internal project'}
            </Eyebrow>
            <div className="mt-200 flex flex-wrap items-center gap-300">
              <h1 className="text-hero-800 leading-hero-800 font-semibold tracking-tight break-words">
                {project.name}
              </h1>
              <ProjectStatusBadge status={project.status} />
              {archived ? (
                <span className="inline-flex items-center gap-100 rounded-full bg-muted px-200 py-100-nudge text-200 leading-200 font-semibold text-muted-foreground">
                  <Archive aria-hidden="true" className="icon-size-100" />
                  Archived
                </span>
              ) : null}
            </div>
          </div>
          {canAddTasks ? (
            <Button onClick={() => onNewTask('todo')}>
              <Plus aria-hidden="true" className="icon-size-200" />
              New task
            </Button>
          ) : null}
        </div>

        {manages ? (
          <div
            role="toolbar"
            aria-label="Manage project"
            className="flex flex-wrap gap-100 border-y border-border py-200"
          >
            <Button variant="ghost" size="sm" onClick={onEditProject}>
              <Pencil aria-hidden="true" className="icon-size-100" />
              Edit details
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleArchive}>
              {archived ? (
                <ArchiveRestore aria-hidden="true" className="icon-size-100" />
              ) : (
                <Archive aria-hidden="true" className="icon-size-100" />
              )}
              {archived ? 'Restore from archive' : 'Move to archive'}
            </Button>
            <Button variant="danger" size="sm" onClick={onDeleteProject}>
              <Trash2 aria-hidden="true" className="icon-size-100" />
              Delete project
            </Button>
          </div>
        ) : null}

        {unclaimed ? (
          <div className="flex flex-wrap items-center gap-300 rounded-xl border border-warning/40 bg-warning/10 px-400 py-300">
            <History aria-hidden="true" className="icon-size-200 shrink-0 text-warning" />
            <p className="min-w-0 flex-1 text-300 leading-300 text-foreground">
              <strong className="font-semibold">Needs a manager.</strong> This
              project was created before roles existed
              {project.lead ? `, with “${project.lead}” noted as lead` : ''}.
              Claim it to become its manager or lead and bring its tasks
              across.
            </p>
            <Button size="sm" onClick={onClaim}>
              Claim project
            </Button>
          </div>
        ) : null}

        {archived ? (
          <p className="flex items-center gap-200 rounded-xl bg-muted px-400 py-300 text-300 leading-300 text-muted-foreground">
            <Lock aria-hidden="true" className="icon-size-200 shrink-0" />
            This project is archived. It's hidden from overviews and its tasks
            are read-only{manages ? ' until you restore it' : ''}.
          </p>
        ) : null}

        <div className="grid gap-500 rounded-2xl border border-border bg-card p-500 md:grid-cols-[1fr_1fr_2fr]">
          <div className="flex flex-col gap-200">
            <Eyebrow className="text-muted-foreground">Your role</Eyebrow>
            {role ? (
              <RoleBadge role={role} className="self-start" />
            ) : (
              <p className="text-300 leading-300 font-semibold text-muted-foreground">
                Not on this team
              </p>
            )}
          </div>
          <Meta
            label="Target date"
            value={project.dueDate ? formatDueDate(project.dueDate) : 'Not set'}
            note={
              project.dueDate && project.status !== 'completed' && !archived
                ? describeDue(project.dueDate, today)
                : undefined
            }
            noteTone={
              targetState === 'overdue'
                ? 'text-destructive'
                : targetState === 'today' || targetState === 'soon'
                  ? 'text-warning'
                  : 'text-muted-foreground'
            }
          />
          {role ? (
            <div className="flex flex-col gap-200">
              <div className="flex items-baseline justify-between gap-300">
                <Eyebrow className="text-muted-foreground">Progress</Eyebrow>
                <span className="font-numeric text-200 leading-200 text-muted-foreground">
                  {progress.total === 0
                    ? 'No tasks yet'
                    : `${progress.done}/${progress.total} done · ${progress.percent}%`}
                </span>
              </div>
              <CapsuleMeter
                done={progress.done}
                total={progress.total}
                segments={24}
                label={`${project.name} progress`}
                className="mt-100"
              />
            </div>
          ) : null}
        </div>

        {project.description ? (
          <p className="max-w-3xl text-300 leading-400 whitespace-pre-line text-muted-foreground">
            {project.description}
          </p>
        ) : null}
      </header>

      <TeamPanel
        team={team}
        meUserId={meUserId}
        canEdit={manages && !archived}
        onAdd={onAddContributor}
        onRemove={onRemoveContributor}
      />

      {role === null && !unclaimed ? (
        <EmptyState
          icon={<EyeOff className="icon-size-600" />}
          title="This board is for the project's team"
          hint="Ask the project manager or project lead to add you as a contributor."
        />
      ) : (
        <section aria-labelledby="board-heading" className="flex flex-col gap-400">
          <div className="flex flex-wrap items-baseline justify-between gap-300">
            <h2 id="board-heading" className="text-500 leading-500 font-semibold">
              Board
            </h2>
            {unclaimed ? (
              <p className="text-200 leading-200 text-muted-foreground">
                View-only until the project is claimed.
              </p>
            ) : !manages ? (
              <p className="text-200 leading-200 text-muted-foreground">
                You can change the tasks assigned to you; the rest are view-only.
              </p>
            ) : null}
          </div>
          {canAddTasks ? (
            <QuickAdd onAdd={onQuickAdd} assignsToMe={!manages} />
          ) : null}
          <Board
            tasks={tasks}
            today={today}
            users={users}
            canEdit={(task) => !archived && !unclaimed && canEditTask(task, role, me)}
            readOnly={archived || unclaimed || role === null}
            onNewTask={onNewTask}
            onOpenTask={onOpenTask}
            onMoveTask={onMoveTask}
          />
        </section>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  note,
  noteTone = 'text-muted-foreground',
}: {
  label: string;
  value: string;
  note?: string;
  noteTone?: string;
}) {
  return (
    <div className="flex flex-col gap-100">
      <Eyebrow className="text-muted-foreground">{label}</Eyebrow>
      <p className="truncate text-400 leading-400 font-semibold text-card-foreground">
        {value}
      </p>
      {note ? (
        <p className={cn('text-[length:var(--text-200)] leading-200 font-medium', noteTone)}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

function QuickAdd({
  onAdd,
  assignsToMe,
}: {
  onAdd(title: string): Promise<MutationResult<unknown>>;
  assignsToMe: boolean;
}) {
  const id = useId();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const trimmed = title.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    const result = await onAdd(trimmed);
    setBusy(false);
    // Keep the text when the save fails so nothing typed is lost.
    if (result.ok) setTitle('');
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex gap-200"
      aria-label="Quick add task"
    >
      <label htmlFor={id} className="sr-only">
        New task title
      </label>
      <input
        id={id}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder={
          assignsToMe
            ? 'Quick add a task for yourself — press Enter'
            : 'Quick add an unassigned task to To do — press Enter'
        }
        className={cn(controlClass, 'h-1000 py-none')}
      />
      <Button type="submit" variant="secondary" disabled={!trimmed || busy}>
        {busy ? 'Adding…' : 'Add'}
      </Button>
    </form>
  );
}

function Board({
  tasks,
  today,
  users,
  canEdit,
  readOnly,
  onNewTask,
  onOpenTask,
  onMoveTask,
}: {
  tasks: readonly TaskRecord[];
  today: string;
  users: UsersById;
  /** Whether the signed-in person may change, and so drag, this task. */
  canEdit(task: TaskRecord): boolean;
  /** Hides the per-column add buttons, e.g. on an archived project. */
  readOnly: boolean;
  onNewTask(status: TaskStatus): void;
  onOpenTask(task: TaskRecord): void;
  onMoveTask(task: TaskRecord, status: TaskStatus): void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  function drop(event: DragEvent, status: TaskStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    const task = tasks.find((t) => t.id === id);
    setDraggingId(null);
    setOverColumn(null);
    if (task && task.status !== status) onMoveTask(task, status);
  }

  return (
    // `relative` makes this the containing block for the cards' visually hidden
    // labels; without it they position against the page and widen it.
    <div
      role="region"
      aria-label="Task board"
      className="relative -mx-400 overflow-x-auto px-400 pb-200 md:mx-none md:px-none"
    >
      <div className="grid auto-cols-[minmax(var(--container-column),1fr)] grid-flow-col gap-400 xl:grid-flow-row xl:grid-cols-4">
        {TASK_STATUSES.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.status === column.value)
            .sort(compareTasks);
          const isOver = overColumn === column.value && draggingId !== null;
          return (
            <div
              key={column.value}
              role="group"
              aria-label={`${column.label}, ${columnTasks.length} ${columnTasks.length === 1 ? 'task' : 'tasks'}`}
              onDragOver={(event) => {
                if (!draggingId) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (overColumn !== column.value) setOverColumn(column.value);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setOverColumn((current) => (current === column.value ? null : current));
                }
              }}
              onDrop={(event) => drop(event, column.value)}
              className={cn(
                'flex min-h-[calc(var(--spacing-1200)*5)] flex-col rounded-2xl border bg-muted/50 p-200 transition-colors',
                isOver ? 'border-primary bg-accent' : 'border-transparent'
              )}
            >
              <div className="flex items-center gap-200 px-200 pt-100 pb-300">
                <span aria-hidden="true" className={cn('size-200 rounded-full', taskStatusDot(column.value))} />
                <h3 className="text-300 leading-300 font-semibold">{column.label}</h3>
                <span className="font-numeric text-200 leading-200 text-muted-foreground">
                  {columnTasks.length}
                </span>
                {readOnly ? null : (
                  <button
                    type="button"
                    onClick={() => onNewTask(column.value)}
                    aria-label={`Add task to ${column.label}`}
                    title={`Add task to ${column.label}`}
                    className="ml-auto rounded-md p-100 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus aria-hidden="true" className="icon-size-200" />
                  </button>
                )}
              </div>

              {columnTasks.length === 0 ? (
                <p className="mx-100 rounded-xl border border-dashed border-input px-300 py-600 text-center text-200 leading-200 text-muted-foreground">
                  {column.value === 'done' ? 'Finished work lands here' : 'No tasks'}
                </p>
              ) : (
                <ul className="flex flex-col gap-200">
                  {columnTasks.map((task) => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        today={today}
                        assignee={
                          task.assignee_id
                            ? (users.get(task.assignee_id)?.name ??
                              task.assignee_email ??
                              null)
                            : null
                        }
                        legacyAssignee={task.assignee_id ? null : (task.assignee ?? null)}
                        draggable={canEdit(task)}
                        dragging={draggingId === task.id}
                        onOpen={() => onOpenTask(task)}
                        onDragStart={(event) => {
                          event.dataTransfer.setData('text/plain', task.id);
                          event.dataTransfer.effectAllowed = 'move';
                          setDraggingId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setOverColumn(null);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  today,
  assignee,
  legacyAssignee,
  draggable,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  task: TaskRecord;
  today: string;
  /** The assignee's display name, or `null` when unassigned. */
  assignee: string | null;
  /** A free-text name from before roles, not yet linked to a person. */
  legacyAssignee: string | null;
  draggable: boolean;
  dragging: boolean;
  onOpen(): void;
  onDragStart(event: DragEvent<HTMLDivElement>): void;
  onDragEnd(): void;
}) {
  const pending = isPending(task);
  const done = task.status === 'done';

  return (
    // A div with a button role, because Firefox will not start a drag from a <button>.
    <div
      role="button"
      tabIndex={pending ? -1 : 0}
      aria-disabled={pending || undefined}
      draggable={draggable && !pending}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (!pending) onOpen();
      }}
      onKeyDown={(event) => {
        if (pending) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col gap-200 rounded-xl border border-border bg-card p-300 shadow-xs transition-[box-shadow,border-color,opacity]',
        'hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dragging && 'opacity-40',
        pending && 'cursor-progress opacity-60'
      )}
    >
      <div className="flex items-center justify-between gap-200">
        <PriorityMark priority={task.priority} />
        <DueChip value={task.dueDate} today={today} done={done} />
      </div>
      <p
        className={cn(
          'line-clamp-3 text-300 leading-300 font-medium break-words',
          done ? 'text-muted-foreground' : 'text-card-foreground'
        )}
      >
        {task.title}
      </p>
      <div className="flex items-center gap-200">
        {task.notes ? (
          <AlignLeft
            aria-label="Has notes"
            className="icon-size-100 text-muted-foreground"
          />
        ) : null}
        {assignee ? (
          <span className="ml-auto flex min-w-0 items-center gap-200-nudge">
            <span className="truncate text-200 leading-200 text-muted-foreground">
              {assignee}
            </span>
            <Avatar name={assignee} className="size-500" />
          </span>
        ) : legacyAssignee ? (
          <span
            className="ml-auto truncate text-200 leading-200 text-muted-foreground"
            title="Recorded before roles existed — not linked to a person yet"
          >
            {legacyAssignee} · <span className="italic">not linked</span>
          </span>
        ) : (
          <span className="ml-auto text-200 leading-200 text-muted-foreground italic">
            Unassigned
          </span>
        )}
      </div>
      {pending ? <span className="sr-only">Saving</span> : null}
    </div>
  );
}
