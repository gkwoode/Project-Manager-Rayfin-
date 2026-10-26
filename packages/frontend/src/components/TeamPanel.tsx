import type { ContributorRecord } from '@rayfin-app/shared';
import { UserPlus, X } from 'lucide-react';

import { Avatar, RoleBadge } from '@/components/badges';
import { Button, Eyebrow } from '@/components/ui';
import { isPending } from '@/components/useCrud';
import type { TeamMember } from '@/lib/access';
import { cn } from '@/lib/utils';

export function TeamPanel({
  team,
  meUserId,
  canEdit,
  onAdd,
  onRemove,
}: {
  team: readonly TeamMember[];
  meUserId: string | null;
  /** Managers and leads add and remove contributors. */
  canEdit: boolean;
  onAdd(): void;
  onRemove(member: TeamMember & { contributor: ContributorRecord }): void;
}) {
  const contributorCount = team.filter((m) => m.role === 'contributor').length;

  return (
    <section
      aria-labelledby="team-heading"
      className="rounded-2xl border border-border bg-card p-500"
    >
      <div className="mb-400 flex flex-wrap items-center justify-between gap-300">
        <div className="flex items-baseline gap-200">
          <h2 id="team-heading" className="text-400 leading-400 font-semibold">
            Team
          </h2>
          <span className="font-numeric text-200 leading-200 text-muted-foreground">
            {team.length}
          </span>
        </div>
        {canEdit ? (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            <UserPlus aria-hidden="true" className="icon-size-100" />
            Add contributor
          </Button>
        ) : null}
      </div>

      <ul className="grid gap-200 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((member) => {
          const row = member.contributor;
          const pending = row ? isPending(row) : false;
          return (
            <li
              key={member.userId}
              className={cn(
                'flex items-center gap-300 rounded-xl border border-border px-300 py-200',
                pending && 'opacity-60'
              )}
            >
              <Avatar name={member.name} className="size-800" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-300 leading-300 font-semibold">
                  {member.name}
                  {member.userId === meUserId ? (
                    <span className="font-normal text-muted-foreground"> (you)</span>
                  ) : null}
                </p>
                <p className="truncate text-200 leading-200 text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <RoleBadge role={member.role} />
              {canEdit && row && !pending ? (
                <button
                  type="button"
                  onClick={() => onRemove({ ...member, contributor: row })}
                  aria-label={`Remove ${member.name} from the team`}
                  title="Remove from team"
                  className="rounded-md p-100 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X aria-hidden="true" className="icon-size-200" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {contributorCount === 0 ? (
        <Eyebrow className="mt-400 text-muted-foreground">
          {canEdit
            ? 'No contributors yet — add the people who will deliver the work'
            : 'No contributors yet'}
        </Eyebrow>
      ) : null}
    </section>
  );
}
