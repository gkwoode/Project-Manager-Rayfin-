import type { UserRecord } from '@rayfin-app/shared';
import { useId, useState, type FormEvent } from 'react';

import { ErrorState } from '@/components/states';
import { Button, Field, Modal, controlClass } from '@/components/ui';
import type { MutationResult } from '@/components/useCrud';
import { findUserByEmail, isEmail, normalizeEmail } from '@/lib/access';
import { nameFromEmail } from '@/lib/people';

const NAME_MAX = 120;
const EMAIL_MAX = 254;

/**
 * Adds someone to the directory, or renames the signed-in person. An email
 * never changes once added, because access to projects and tasks follows it.
 */
export function PersonDialog({
  person,
  users,
  onClose,
  onSave,
}: {
  /** The signed-in person's entry to rename; omit to add someone new. */
  person?: UserRecord;
  users: readonly UserRecord[];
  onClose(): void;
  onSave(input: { name: string; email: string }): Promise<MutationResult<unknown>>;
}) {
  const id = useId();
  const renaming = person !== undefined;
  const [name, setName] = useState(person?.name ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeEmail(email);
  const duplicate = renaming ? undefined : findUserByEmail(users, normalized);
  const emailProblem =
    renaming || email.trim() === ''
      ? null
      : !isEmail(email)
        ? 'Enter a full work email.'
        : duplicate
          ? `${duplicate.name} already uses this email.`
          : null;
  const trimmedName = name.trim();
  const canSave =
    !saving &&
    (renaming
      ? trimmedName.length > 0 && trimmedName !== person.name
      : isEmail(email) && !duplicate);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const result = await onSave({
      name: trimmedName || nameFromEmail(normalized),
      email: normalized,
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
      title={renaming ? 'Edit your name' : 'Add a person'}
      eyebrow="People"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-200">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSave}>
            {saving ? 'Saving…' : renaming ? 'Save name' : 'Add person'}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-400"
      >
        {error ? <ErrorState title="Not saved" message={error} /> : null}
        <Field
          label="Work email"
          htmlFor={`${id}-email`}
          hint={
            emailProblem ? (
              <span role="alert" className="text-destructive">
                {emailProblem}
              </span>
            ) : renaming ? (
              'Your email can’t be changed — your access follows it.'
            ) : (
              'They sign in with this email. It can’t be changed later.'
            )
          }
        >
          <input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={EMAIL_MAX}
            readOnly={renaming}
            required
            data-autofocus={renaming ? undefined : true}
            autoComplete="off"
            placeholder="name@relianceinfosystems.com"
            aria-invalid={emailProblem ? true : undefined}
            className={controlClass}
          />
        </Field>
        <Field
          label="Name"
          htmlFor={`${id}-name`}
          hint={
            !renaming && !trimmedName && isEmail(email)
              ? `Shown as “${nameFromEmail(normalized)}” if left blank.`
              : undefined
          }
        >
          <input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            required={renaming}
            data-autofocus={renaming ? true : undefined}
            autoComplete="off"
            placeholder="Full name"
            className={controlClass}
          />
        </Field>
      </form>
    </Modal>
  );
}
