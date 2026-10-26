import type { UserRecord } from '@rayfin-app/shared';
import { Pencil, Search, UserPlus, Users } from 'lucide-react';
import { useId, useState } from 'react';

import { Avatar } from '@/components/badges';
import { EmptyState } from '@/components/states';
import { Button, Eyebrow, controlClass } from '@/components/ui';
import { isPending } from '@/components/useCrud';
import { cn } from '@/lib/utils';

/** The user directory: everyone who can be put on a project team. */
export function People({
  users,
  meUserId,
  projectCounts,
  onAdd,
  onRenameMe,
}: {
  users: readonly UserRecord[];
  meUserId: string | null;
  /** How many active projects each person is on, by user id. */
  projectCounts: ReadonlyMap<string, number>;
  onAdd(): void;
  onRenameMe(): void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? users.filter((u) =>
        `${u.name} ${u.email}`.toLowerCase().includes(needle)
      )
    : users;

  return (
    <div className="flex flex-col gap-600">
      <header className="flex flex-wrap items-end justify-between gap-400">
        <div>
          <Eyebrow className="text-brand-foreground">Directory</Eyebrow>
          <h1 className="mt-200 text-hero-900 leading-hero-900 font-semibold tracking-tight">
            People
          </h1>
          <p className="mt-100 text-400 leading-400 text-muted-foreground">
            Everyone who can manage, lead, or contribute to a project.
          </p>
        </div>
        <Button onClick={onAdd}>
          <UserPlus aria-hidden="true" className="icon-size-200" />
          Add person
        </Button>
      </header>

      <div className="relative w-full sm:max-w-sm">
        <label htmlFor={searchId} className="sr-only">
          Search people
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-300 icon-size-200 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className={cn(controlClass, 'pl-1000')}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Users className="icon-size-600" />}
          title={needle ? 'Nobody matches your search' : 'No people yet'}
          hint={
            needle
              ? 'Try a different name or email.'
              : 'People are added when they are put on a project, or here.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">People in the directory</caption>
            <thead className="hidden bg-muted/50 md:table-header-group">
              <tr className="text-[length:var(--text-100)] leading-100 font-semibold tracking-wordmark text-muted-foreground uppercase">
                <th scope="col" className="px-500 py-300 font-semibold">Name</th>
                <th scope="col" className="px-500 py-300 font-semibold">Email</th>
                <th scope="col" className="px-500 py-300 text-right font-semibold">
                  Active projects
                </th>
                <th scope="col" className="w-none px-500 py-300">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((user) => {
                const isMe = user.id === meUserId;
                return (
                  <tr
                    key={user.id}
                    className={cn(
                      'grid grid-cols-[1fr_auto] gap-x-300 border-b border-border px-500 py-300 last:border-b-0 md:table-row md:px-none md:py-none',
                      isPending(user) && 'opacity-60'
                    )}
                  >
                    <td className="md:px-500 md:py-300">
                      <span className="flex items-center gap-300">
                        <Avatar name={user.name} className="size-800" />
                        <span className="min-w-0">
                          <span className="block truncate text-300 leading-300 font-semibold">
                            {user.name}
                            {isMe ? (
                              <span className="font-normal text-muted-foreground"> (you)</span>
                            ) : null}
                          </span>
                          <span className="block truncate text-200 leading-200 text-muted-foreground md:hidden">
                            {user.email}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="hidden truncate text-300 leading-300 text-muted-foreground md:table-cell md:px-500 md:py-300">
                      {user.email}
                    </td>
                    <td className="self-center text-right font-numeric text-300 leading-300 md:px-500 md:py-300">
                      {projectCounts.get(user.id) ?? 0}
                      <span className="sr-only"> active projects</span>
                    </td>
                    <td className="col-span-2 md:px-500 md:py-300 md:text-right">
                      {isMe ? (
                        <Button variant="ghost" size="sm" onClick={onRenameMe}>
                          <Pencil aria-hidden="true" className="icon-size-100" />
                          Edit your name
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
