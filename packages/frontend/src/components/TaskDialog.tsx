import type {
  ProjectRole,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '@rayfin-app/shared';
import { useId, useState, type FormEvent } from 'react';

import { ConfirmDelete, ErrorState } from '@/components/states';
import { Button, Field, Modal, controlClass } from '@/components/ui';
import type { MutationResult } from '@/components/useCrud';
import {
  ROLE_LABEL,
  canManage,
  type TeamMember,
  type UsersById,
} from '@/lib/access';
import { toYmd, ymdToDate } from '@/lib/dates';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/labels';

export type TaskDraft = Pick<
  TaskRecord,
  | 'title'
  | 'notes'
  | 'status'
  | 'priority'
  | 'assignee'
  | 'assignee_id'
  | 'assignee_email'
  | 'dueDate'
>;

const TITLE_MAX = 200;
const NOTES_MAX = 2000;

/** Why a task opens read-only, shown at the top of the dialog. */
export type ReadOnlyReason = 'archived' | 'not-yours';

export interface TaskDialogProps {
  /** The task being edited; omit to create one. */
  task?: TaskRecord;
  /** Starting column for a new task. */
  defaultStatus?: TaskStatus;
  projectName: string;
  team: readonly TeamMember[];
  users: UsersById;
  /** The signed-in person's role on the project. */
  role: ProjectRole | null;
  /** The signed-in person's directory entry, when they have one. */
  meUserId: string | null;
  me: string;
  readOnly?: ReadOnlyReason | null;
  onClose(): void;
  onSave(draft: TaskDraft): Promise<MutationResult<unknown>>;
  onDelete?(): Promise<MutationResult<void>>;
}

export function TaskDialog({
  task,
  defaultStatus = 'todo',
  projectName,
  team,
  users,
  role,
  meUserId,
  me,
  readOnly = null,
  onClose,
  onSave,
  onDelete,
}: TaskDialogProps) {
  const id = useId();
  const editing = task !== undefined;
  const manages = canManage(role);
  const locked = readOnly !== null;

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? 'medium'
  );
  // Contributors can only hold tasks themselves; managers choose anyone on the team.
  const [assigneeId, setAssigneeId] = useState(
    manages || locked ? (task?.assignee_id ?? '') : (meUserId ?? '')
  );
  const [due, setDue] = useState(toYmd(task?.dueDate) ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Someone taken off the team keeps their name on old tasks until reassigned.
  const offTeam =
    task?.assignee_id && !team.some((m) => m.userId === task.assignee_id)
      ? {
          userId: task.assignee_id,
          email: task.assignee_email ?? '',
          name: users.get(task.assignee_id)?.name ?? task.assignee_email ?? 'Former member',
        }
      : null;
  const assigneeName =
    users.get(assigneeId)?.name ??
    team.find((m) => m.userId === assigneeId)?.name ??
    offTeam?.name;

  const legacyName = task?.assignee_id ? null : (task?.assignee ?? null);

  const trimmedTitle = title.trim();
  const canSave =
    !locked && trimmedTitle.length > 0 && (manages || meUserId !== null) && !saving;

  function assigneeEmail(userId: string): string | null {
    if (!userId) return null;
    if (userId === meUserId) return me;
    return (
      team.find((m) => m.userId === userId)?.email ??
      (offTeam?.userId === userId ? offTeam.email : null)
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const result = await onSave({
      title: trimmedTitle,
      notes: notes.trim() || null,
      status,
      priority,
      assignee_id: assigneeId || null,
      assignee_email: assigneeEmail(assigneeId),
      // A name from before roles is replaced once a real person is chosen.
      ...(legacyName && assigneeId ? { assignee: null } : {}),
      dueDate: due ? ymdToDate(due) : null,
    });
    if (result.ok) {
      onClose();
      return;
    }
    setSaving(false);
    setError(result.error);
  }

  async function confirmDelete() {
    if (!onDelete) return;
    setDeleting(true);
    setError(null);
    const result = await onDelete();
    if (result.ok) {
      onClose();
      return;
    }
    setDeleting(false);
    setConfirming(false);
    setError(result.error);
  }

  const formId = `${id}-form`;

  return (
    <Modal
      title={locked ? 'Task' : editing ? 'Edit task' : 'New task'}
      eyebrow={projectName}
      onClose={onClose}
      footer={
        locked ? (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : confirming ? (
          <ConfirmDelete
            label={trimmedTitle || 'this task'}
            pending={deleting}
            onCancel={() => setConfirming(false)}
            onConfirm={() => void confirmDelete()}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-200">
            {editing && onDelete ? (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                Delete task
              </Button>
            ) : null}
            <div className="ml-auto flex gap-200">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" form={formId} disabled={!canSave}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}
              </Button>
            </div>
          </div>
        )
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void submit(event)}
        className="grid gap-400 sm:grid-cols-2"
      >
        <fieldset disabled={locked} className="contents">
          {error ? (
            <div className="sm:col-span-2">
              <ErrorState title="Not saved" message={error} />
            </div>
          ) : null}
          {readOnly ? (
            <p className="rounded-lg bg-muted px-300 py-200 text-200 leading-200 text-muted-foreground sm:col-span-2">
              {readOnly === 'archived'
                ? 'This project is archived, so its tasks are read-only.'
                : 'View only — you can change the tasks assigned to you.'}
            </p>
          ) : null}

          <Field label="Title" htmlFor={`${id}-title`} className="sm:col-span-2">
            <input
              id={`${id}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX}
              required
              data-autofocus
              placeholder="What needs to happen?"
              className={controlClass}
            />
          </Field>

          <Field label="Status" htmlFor={`${id}-status`}>
            <select
              id={`${id}-status`}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className={controlClass}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Priority" htmlFor={`${id}-priority`}>
            <select
              id={`${id}-priority`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={controlClass}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Assignee"
            htmlFor={`${id}-assignee`}
            hint={
              legacyName && !assigneeId
                ? `Recorded before roles as “${legacyName}”.${manages && !locked ? ' Choose them from the team to link this task.' : ''}`
                : locked
                  ? undefined
                  : manages
                    ? 'The assignee, the project manager, and the project lead can change this task.'
                    : 'Tasks you add are assigned to you.'
            }
          >
            {manages && !locked ? (
              <select
                id={`${id}-assignee`}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={controlClass}
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                    {m.userId === meUserId ? ' (you)' : ''} — {ROLE_LABEL[m.role]}
                  </option>
                ))}
                {offTeam ? (
                  <option value={offTeam.userId}>
                    {offTeam.name} (no longer on the team)
                  </option>
                ) : null}
              </select>
            ) : (
              <input
                id={`${id}-assignee`}
                value={
                  assigneeId
                    ? `${assigneeName ?? 'Unknown person'}${assigneeId === meUserId ? ' (you)' : ''}`
                    : 'Unassigned'
                }
                readOnly
                className={controlClass}
              />
            )}
          </Field>

          <Field label="Due date" htmlFor={`${id}-due`}>
            <input
              id={`${id}-due`}
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={controlClass}
            />
          </Field>

          <Field
            label="Notes"
            htmlFor={`${id}-notes`}
            className="sm:col-span-2"
            hint={locked ? undefined : `${notes.length} / ${NOTES_MAX}`}
          >
            <textarea
              id={`${id}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={NOTES_MAX}
              rows={4}
              placeholder={locked ? '' : 'Context, links, acceptance criteria…'}
              className={`${controlClass} resize-y`}
            />
          </Field>
        </fieldset>
      </form>
    </Modal>
  );
}
