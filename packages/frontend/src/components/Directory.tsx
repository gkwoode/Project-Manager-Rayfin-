import type { ProjectRecord, ProjectRole } from '@rayfin-app/shared';
import { Archive, FolderSearch, Plus, Search } from 'lucide-react';
import { useId, useState } from 'react';

import { ProjectStatusBadge, RoleBadge } from '@/components/badges';
import { isUnclaimed, type UsersById } from '@/lib/access';
import { EmptyState } from '@/components/states';
import { Button, Eyebrow, controlClass } from '@/components/ui';
import { isPending } from '@/components/useCrud';
import { formatDueDate } from '@/lib/dates';
import { cn } from '@/lib/utils';

export type DirectoryTab = 'active' | 'archived';

/** Every project in the company, with the signed-in person's role on each. */
export function Directory({
  projects,
  users,
  roles,
  teamSizes,
  tab,
  onTabChange,
  onOpenProject,
  onNewProject,
}: {
  projects: readonly ProjectRecord[];
  users: UsersById;
  roles: ReadonlyMap<string, ProjectRole | null>;
  teamSizes: ReadonlyMap<string, number>;
  tab: DirectoryTab;
  onTabChange(tab: DirectoryTab): void;
  onOpenProject(id: string): void;
  onNewProject(): void;
}) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const nameOf = (id: string | null | undefined, email: string | null | undefined) =>
    id ? (users.get(id)?.name ?? email ?? null) : null;

  const archivedCount = projects.filter((p) => p.archived).length;
  const inTab = projects.filter((p) => (tab === 'archived') === (p.archived === true));
  const shown = needle
    ? inTab.filter((p) =>
        [
          p.name,
          p.client,
          nameOf(p.manager_id, p.manager_email),
          nameOf(p.lead_id, p.lead_email),
          p.manager_email,
          p.lead_email,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      )
    : inTab;

  return (
    <div className="flex flex-col gap-600">
      <header className="flex flex-wrap items-end justify-between gap-400">
        <div>
          <Eyebrow className="text-brand-foreground">Directory</Eyebrow>
          <h1 className="mt-200 text-hero-900 leading-hero-900 font-semibold tracking-tight">
            All projects
          </h1>
          <p className="mt-100 text-400 leading-400 text-muted-foreground">
            Every project at Reliance Infosystems. Open one to see its team.
          </p>
        </div>
        <Button onClick={onNewProject}>
          <Plus aria-hidden="true" className="icon-size-200" />
          New project
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-300">
        <div
          role="group"
          aria-label="Show projects"
          className="inline-flex rounded-lg border border-border bg-card p-100"
        >
          {(['active', 'archived'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => onTabChange(value)}
              className={cn(
                'inline-flex items-center gap-100 rounded-md px-300 py-200-nudge text-[length:var(--text-300)] leading-300 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                tab === value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {value === 'archived' ? (
                <Archive aria-hidden="true" className="icon-size-100" />
              ) : null}
              {value === 'active' ? 'Active' : 'Archived'}
              <span className="font-numeric text-200 opacity-80">
                {value === 'active' ? projects.length - archivedCount : archivedCount}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-[calc(var(--spacing-1200)*6)]">
          <label htmlFor={searchId} className="sr-only">
            Search projects
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
            placeholder="Search projects or people"
            className={cn(controlClass, 'pl-1000')}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<FolderSearch className="icon-size-600" />}
          title={
            needle
              ? 'No projects match your search'
              : tab === 'archived'
                ? 'No archived projects'
                : 'No projects yet'
          }
          hint={
            needle
              ? 'Try a different name, client, or person.'
              : tab === 'archived'
                ? 'Projects a manager or lead moves to the archive appear here.'
                : 'Create the first project to get the team started.'
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
          {shown.map((project) => {
            const role = roles.get(project.id) ?? null;
            const size = teamSizes.get(project.id) ?? 0;
            return (
              <li key={project.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  disabled={isPending(project)}
                  onClick={() => onOpenProject(project.id)}
                  className="grid w-full gap-300 px-500 py-400 text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-60 md:grid-cols-[2fr_1fr_1.5fr_1fr] md:items-center"
                >
                  <div className="min-w-0">
                    <Eyebrow className="truncate text-muted-foreground">
                      {project.client || 'Internal'}
                    </Eyebrow>
                    <p className="mt-100 truncate font-heading text-400 leading-400 font-semibold">
                      {project.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-200">
                    <ProjectStatusBadge status={project.status} />
                    {project.dueDate ? (
                      <span className="font-numeric text-200 leading-200 text-muted-foreground">
                        {formatDueDate(project.dueDate, 'short')}
                      </span>
                    ) : null}
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-200 text-200 leading-200">
                    <dt className="text-muted-foreground">Manager</dt>
                    <dd className="truncate font-medium">
                      {nameOf(project.manager_id, project.manager_email) || '—'}
                    </dd>
                    <dt className="text-muted-foreground">Lead</dt>
                    <dd className="truncate font-medium">
                      {nameOf(project.lead_id, project.lead_email) ||
                        (project.lead ? `${project.lead} (earlier)` : '—')}
                    </dd>
                    <dt className="text-muted-foreground">Team</dt>
                    <dd className="font-numeric font-medium">{size}</dd>
                  </dl>
                  <div className="md:justify-self-end">
                    {role ? (
                      <RoleBadge role={role} />
                    ) : isUnclaimed(project) ? (
                      <span className="inline-flex items-center rounded-full bg-warning/10 px-200 py-100-nudge text-[length:var(--text-100)] leading-100 font-semibold tracking-wider whitespace-nowrap text-warning uppercase">
                        Needs a manager
                      </span>
                    ) : (
                      <span className="text-200 leading-200 text-muted-foreground">
                        Not on team
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
