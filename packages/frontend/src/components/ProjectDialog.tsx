import type { ProjectRecord, ProjectStatus, UserRecord } from '@rayfin-app/shared';
import { TriangleAlert } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { PersonPicker, type PersonInput } from '@/components/PersonPicker';
import { ErrorState } from '@/components/states';
import { Button, Field, Modal, controlClass } from '@/components/ui';
import type { MutationResult } from '@/components/useCrud';
import { isEmail, normalizeEmail, sameEmail, type UsersById } from '@/lib/access';
import { toYmd, ymdToDate } from '@/lib/dates';
import { PROJECT_STATUSES } from '@/lib/labels';

/**
 * What the dialog collects. The manager and lead are people, not ids yet:
 * someone new to the directory is added when the project is saved.
 */
export interface ProjectDraft {
  fields: Pick<
    ProjectRecord,
    'name' | 'client' | 'description' | 'status' | 'dueDate'
  >;
  manager: PersonInput | null;
  lead: PersonInput | null;
}

const NAME_MAX = 120;
const SHORT_MAX = 120;
const DESCRIPTION_MAX = 2000;

export interface ProjectDialogProps {
  /** The project being edited; omit to create one. */
  project?: ProjectRecord;
  users: readonly UserRecord[];
  usersById: UsersById;
  /** The signed-in person's email and display name. */
  me: string;
  myName: string;
  onClose(): void;
  onSave(draft: ProjectDraft): Promise<MutationResult<unknown>>;
}

function personFor(
  usersById: UsersById,
  id: string | null | undefined,
  copiedEmail: string | null | undefined
): PersonInput {
  const user = id ? usersById.get(id) : undefined;
  return { email: user?.email ?? copiedEmail ?? '', name: user?.name ?? '' };
}

export function ProjectDialog({
  project,
  users,
  usersById,
  me,
  myName,
  onClose,
  onSave,
}: ProjectDialogProps) {
  const id = useId();
  const editing = project !== undefined;

  const [name, setName] = useState(project?.name ?? '');
  const [client, setClient] = useState(project?.client ?? '');
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? 'planning'
  );
  const [due, setDue] = useState(toYmd(project?.dueDate) ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  // A new project starts with its creator as manager; they can switch to lead.
  const [manager, setManager] = useState<PersonInput>(
    editing
      ? personFor(usersById, project.manager_id, project.manager_email)
      : { email: me, name: myName }
  );
  const [lead, setLead] = useState<PersonInput>(
    personFor(usersById, project?.lead_id, project?.lead_email)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const managerEmail = normalizeEmail(manager.email);
  const leadEmail = normalizeEmail(lead.email);
  const meInLeadership = sameEmail(managerEmail, me) || sameEmail(leadEmail, me);

  const managerProblem =
    managerEmail && !isEmail(managerEmail) ? 'Enter a full work email.' : null;
  const leadProblem =
    leadEmail && !isEmail(leadEmail)
      ? 'Enter a full work email.'
      : leadEmail && leadEmail === managerEmail
        ? 'The lead must be a different person from the manager.'
        : null;
  const leadershipProblem =
    !managerEmail && !leadEmail
      ? 'A project needs a project manager, a project lead, or both.'
      : !editing && !meInLeadership
        ? 'You need to be the project manager or the project lead of a project you create.'
        : null;

  const canSave =
    trimmedName.length > 0 &&
    !managerProblem &&
    !leadProblem &&
    !leadershipProblem &&
    !saving;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const result = await onSave({
      fields: {
        name: trimmedName,
        client: client.trim() || null,
        status,
        dueDate: due ? ymdToDate(due) : null,
        description: description.trim() || null,
      },
      manager: managerEmail ? { email: managerEmail, name: manager.name.trim() } : null,
      lead: leadEmail ? { email: leadEmail, name: lead.name.trim() } : null,
    });
    if (result.ok) {
      onClose();
      return;
    }
    setSaving(false);
    setError(result.error);
  }

  const formId = `${id}-form`;

  return (
    <Modal
      title={editing ? 'Edit project' : 'New project'}
      eyebrow={editing ? (project.client ?? 'Project') : 'Reliance Infosystems'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSave}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void submit(event)}
        className="grid gap-400 sm:grid-cols-2"
      >
        {error ? (
          <div className="sm:col-span-2">
            <ErrorState title="Not saved" message={error} />
          </div>
        ) : null}

        <Field
          label="Project name"
          htmlFor={`${id}-name`}
          className="sm:col-span-2"
        >
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            required
            data-autofocus
            placeholder="e.g. Dynamics 365 rollout"
            className={controlClass}
          />
        </Field>

        <Field label="Client" htmlFor={`${id}-client`}>
          <input
            id={`${id}-client`}
            value={client}
            onChange={(e) => setClient(e.target.value)}
            maxLength={SHORT_MAX}
            placeholder="Internal"
            className={controlClass}
          />
        </Field>

        <Field label="Status" htmlFor={`${id}-status`}>
          <select
            id={`${id}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className={controlClass}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <PersonPicker
          id={`${id}-manager`}
          legend="Project manager"
          value={manager}
          users={users}
          me={me}
          myName={myName}
          problem={managerProblem}
          onChange={setManager}
        />
        <PersonPicker
          id={`${id}-lead`}
          legend="Project lead"
          value={lead}
          users={users}
          me={me}
          myName={myName}
          problem={leadProblem}
          onChange={setLead}
        />

        {leadershipProblem ? (
          <p
            role="alert"
            className="text-200 leading-200 font-medium text-destructive sm:col-span-2"
          >
            {leadershipProblem}
          </p>
        ) : editing && !meInLeadership ? (
          <p className="flex items-start gap-200 rounded-lg bg-warning/10 px-300 py-200 text-200 leading-200 text-warning sm:col-span-2">
            <TriangleAlert aria-hidden="true" className="icon-size-200 shrink-0" />
            After saving you won't be this project's manager or lead, so you
            won't be able to change it or its tasks any more.
          </p>
        ) : null}

        <Field label="Target date" htmlFor={`${id}-due`}>
          <input
            id={`${id}-due`}
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className={controlClass}
          />
        </Field>

        <Field
          label="Description"
          htmlFor={`${id}-description`}
          className="sm:col-span-2"
          hint={`${description.length} / ${DESCRIPTION_MAX}`}
        >
          <textarea
            id={`${id}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={3}
            placeholder="Scope, goals, and what done looks like."
            className={`${controlClass} resize-y`}
          />
        </Field>
      </form>
    </Modal>
  );
}
