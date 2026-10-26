import type { UserRecord } from '@rayfin-app/shared';
import { useId, useState, type FormEvent } from 'react';

import { PersonPicker, type PersonInput } from '@/components/PersonPicker';
import { ErrorState } from '@/components/states';
import { Button, Modal } from '@/components/ui';
import type { MutationResult } from '@/components/useCrud';
import { isEmail, normalizeEmail, type TeamMember } from '@/lib/access';

/** Adds a contributor to a project's team. Managers and leads only. */
export function ContributorDialog({
  projectName,
  team,
  users,
  onClose,
  onAdd,
}: {
  projectName: string;
  /** Everyone already on the project, to stop duplicates. */
  team: readonly TeamMember[];
  users: readonly UserRecord[];
  onClose(): void;
  onAdd(person: PersonInput): Promise<MutationResult<unknown>>;
}) {
  const id = useId();
  const [person, setPerson] = useState<PersonInput>({ email: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = normalizeEmail(person.email);
  const existing = team.find((m) => m.email === email);
  const problem =
    email === ''
      ? null
      : !isEmail(email)
        ? 'Enter a full work email, like name@relianceinfosystems.com.'
        : existing
          ? `${existing.name} is already on this team.`
          : null;
  const canSave = isEmail(email) && !existing && !saving;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const result = await onAdd({ email, name: person.name.trim() });
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
      title="Add a contributor"
      eyebrow={projectName}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSave}>
            {saving ? 'Adding…' : 'Add to team'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-400"
      >
        {error ? <ErrorState title="Not added" message={error} /> : null}
        <p className="text-300 leading-400 text-muted-foreground">
          Contributors see the whole board and change only the tasks assigned
          to them. They sign in with this email to get access.
        </p>
        <PersonPicker
          id={`${id}-person`}
          legend="Contributor"
          value={person}
          users={users}
          problem={problem}
          autoFocus
          onChange={setPerson}
        />
      </form>
    </Modal>
  );
}
