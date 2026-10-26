import type { UserRecord } from '@rayfin-app/shared';
import { UserRoundCheck, UserRoundPlus } from 'lucide-react';

import { controlClass } from '@/components/ui';
import { findUserByEmail, isEmail, sameEmail } from '@/lib/access';
import { nameFromEmail } from '@/lib/people';

/** A person chosen in a form: an existing directory entry, or a new one to add. */
export interface PersonInput {
  email: string;
  name: string;
}

const NAME_MAX = 120;
const EMAIL_MAX = 254;

/**
 * Picks someone by work email. Directory matches are suggested and shown by
 * name; an email not in the directory asks for a name and is added on save.
 */
export function PersonPicker({
  id,
  legend,
  value,
  users,
  me,
  myName,
  problem,
  autoFocus = false,
  onChange,
}: {
  id: string;
  legend: string;
  value: PersonInput;
  users: readonly UserRecord[];
  /** The signed-in person, for "That's me"; omit to hide it. */
  me?: string;
  myName?: string;
  problem?: string | null;
  autoFocus?: boolean;
  onChange(value: PersonInput): void;
}) {
  const existing = findUserByEmail(users, value.email);
  const isNew = !existing && isEmail(value.email);
  const isMe = me ? sameEmail(value.email, me) : false;

  return (
    <fieldset className="flex min-w-0 flex-col gap-200 rounded-xl border border-border p-300">
      <legend className="px-100 text-200 font-semibold tracking-wide text-muted-foreground uppercase">
        {legend}
      </legend>
      <label htmlFor={`${id}-email`} className="sr-only">
        {legend} work email
      </label>
      <input
        id={`${id}-email`}
        type="email"
        value={value.email}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
        maxLength={EMAIL_MAX}
        list={`${id}-people`}
        autoComplete="off"
        placeholder="Work email"
        aria-invalid={problem ? true : undefined}
        data-autofocus={autoFocus || undefined}
        className={controlClass}
      />
      <datalist id={`${id}-people`}>
        {users.map((user) => (
          <option key={user.id} value={user.email}>
            {user.name}
          </option>
        ))}
      </datalist>

      {existing ? (
        <p className="flex items-center gap-100 text-200 leading-200 text-muted-foreground">
          <UserRoundCheck aria-hidden="true" className="icon-size-100 text-success" />
          <span>
            <strong className="font-semibold text-foreground">{existing.name}</strong>
            {isMe ? ' (you)' : ''}
          </span>
        </p>
      ) : isNew ? (
        <>
          <p className="flex items-center gap-100 text-200 leading-200 text-muted-foreground">
            <UserRoundPlus aria-hidden="true" className="icon-size-100" />
            New to the directory — they'll be added.
          </p>
          <label htmlFor={`${id}-name`} className="sr-only">
            {legend} name
          </label>
          <input
            id={`${id}-name`}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder={`Name (or “${nameFromEmail(value.email)}”)`}
            className={controlClass}
          />
        </>
      ) : null}

      {problem ? (
        <p role="alert" className="text-200 leading-200 text-destructive">
          {problem}
        </p>
      ) : null}

      <div className="flex gap-300 text-200 leading-200">
        {me && !isMe ? (
          <button
            type="button"
            onClick={() => onChange({ email: me, name: myName ?? '' })}
            className="inline-flex items-center gap-100 rounded-md font-semibold text-brand-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserRoundCheck aria-hidden="true" className="icon-size-100" />
            That's me
          </button>
        ) : null}
        {value.email || value.name ? (
          <button
            type="button"
            onClick={() => onChange({ email: '', name: '' })}
            className="rounded-md font-semibold text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
