import type { ProjectRecord, UserRecord } from '@rayfin-app/shared';
import { History } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { PersonPicker, type PersonInput } from '@/components/PersonPicker';
import { ErrorState } from '@/components/states';
import { Button, Eyebrow, Modal } from '@/components/ui';
import type { MutationResult } from '@/components/useCrud';
import {
  findUserByName,
  isEmail,
  normalizeEmail,
  sameEmail,
} from '@/lib/access';

export interface ClaimDraft {
  manager: PersonInput | null;
  lead: PersonInput | null;
  /** Each old free-text assignee name, and the person it means (or `null` to leave it unlinked). */
  assignees: { name: string; person: PersonInput | null }[];
}

/** A directory person for an old free-text name, or the name awaiting an email. */
function personFromName(users: readonly UserRecord[], name: string): PersonInput {
  const match = findUserByName(users, name);
  return match ? { email: match.email, name: match.name } : { email: '', name };
}

/**
 * Claims a project from before roles existed: the claimer becomes its manager
 * or lead, and the old free-text names are linked to people in the directory.
 */
export function ClaimDialog({
  project,
  legacyAssignees,
  users,
  me,
  myName,
  onClose,
  onClaim,
}: {
  project: ProjectRecord;
  /** Distinct free-text assignee names on the project's old tasks. */
  legacyAssignees: readonly string[];
  users: readonly UserRecord[];
  me: string;
  myName: string;
  onClose(): void;
  onClaim(draft: ClaimDraft): Promise<MutationResult<unknown>>;
}) {
  const id = useId();
  const [manager, setManager] = useState<PersonInput>({ email: me, name: myName });
  const [lead, setLead] = useState<PersonInput>(
    project.lead ? personFromName(users, project.lead) : { email: '', name: '' }
  );
  const [assignees, setAssignees] = useState(() =>
    legacyAssignees.map((name) => ({ name, person: personFromName(users, name) }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const managerEmail = normalizeEmail(manager.email);
  const leadEmail = normalizeEmail(lead.email);
  const meInLeadership = sameEmail(managerEmail, me) || sameEmail(leadEmail, me);
  const problemFor = (email: string) =>
    email && !isEmail(email) ? 'Enter a full work email.' : null;
  const leadProblem =
    problemFor(leadEmail) ??
    (leadEmail && leadEmail === managerEmail
      ? 'The lead must be a different person from the manager.'
      : null);
  const leadershipProblem = meInLeadership
    ? null
    : 'You need to be the project manager or the project lead of a project you claim.';
  const assigneeProblems = assignees.map((a) =>
    problemFor(normalizeEmail(a.person?.email))
  );

  const canSave =
    !saving &&
    !problemFor(managerEmail) &&
    !leadProblem &&
    !leadershipProblem &&
    assigneeProblems.every((p) => p === null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const result = await onClaim({
      manager: managerEmail ? { email: managerEmail, name: manager.name.trim() } : null,
      lead: leadEmail ? { email: leadEmail, name: lead.name.trim() } : null,
      assignees: assignees.map((a) => {
        const email = normalizeEmail(a.person?.email);
        return {
          name: a.name,
          person: email ? { email, name: a.person?.name.trim() || a.name } : null,
        };
      }),
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
      title="Claim this project"
      eyebrow={project.name}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSave}>
            {saving ? 'Claiming…' : 'Claim project'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-500"
      >
        {error ? <ErrorState title="Not claimed" message={error} /> : null}

        <p className="flex items-start gap-200 rounded-lg bg-muted px-300 py-200 text-200 leading-300 text-muted-foreground">
          <History aria-hidden="true" className="mt-100-nudge icon-size-200 shrink-0" />
          This project was created before roles existed. Choose its project
          manager and lead, and link the people its tasks were assigned to.
          Its tasks and history are kept.
        </p>

        <div className="grid gap-400 sm:grid-cols-2">
          <PersonPicker
            id={`${id}-manager`}
            legend="Project manager"
            value={manager}
            users={users}
            me={me}
            myName={myName}
            problem={problemFor(managerEmail)}
            autoFocus
            onChange={setManager}
          />
          <div className="flex flex-col gap-100">
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
            {project.lead && !leadEmail ? (
              <p className="px-100 text-200 leading-200 text-muted-foreground">
                Previously recorded as “{project.lead}”. Add their work email to
                keep them as lead.
              </p>
            ) : null}
          </div>
        </div>

        {leadershipProblem ? (
          <p role="alert" className="text-200 leading-200 font-medium text-destructive">
            {leadershipProblem}
          </p>
        ) : null}

        {assignees.length > 0 ? (
          <section aria-labelledby={`${id}-assignees`} className="flex flex-col gap-300">
            <div>
              <Eyebrow className="text-muted-foreground">
                <span id={`${id}-assignees`}>Task assignees from before roles</span>
              </Eyebrow>
              <p className="mt-100 text-200 leading-200 text-muted-foreground">
                Each person you link joins the team as a contributor and keeps
                their tasks. Leave an email empty to keep those tasks unassigned
                for now.
              </p>
            </div>
            <div className="grid gap-300 sm:grid-cols-2">
              {assignees.map((a, index) => (
                <PersonPicker
                  key={a.name}
                  id={`${id}-assignee-${index}`}
                  legend={`“${a.name}”`}
                  value={a.person ?? { email: '', name: a.name }}
                  users={users}
                  problem={assigneeProblems[index]}
                  onChange={(person) =>
                    setAssignees((prev) =>
                      prev.map((p, i) => (i === index ? { ...p, person } : p))
                    )
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </form>
    </Modal>
  );
}
