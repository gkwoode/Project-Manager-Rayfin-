import type { ProjectRecord, TaskRecord } from '@rayfin-app/shared';
import {
  Archive,
  LayoutGrid,
  Library,
  Moon,
  Plus,
  Sun,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

import logoOnDark from '@/assets/reliance-logo-dark.png';
import type { DirectoryTab } from '@/components/Directory';
import { CapsuleMeter, Eyebrow } from '@/components/ui';
import { isPending } from '@/components/useCrud';
import { useTheme } from '@/hooks/theme.context';
import { progressOf } from '@/lib/portfolio';
import { initials } from '@/lib/people';
import { projectTone } from '@/lib/tones';
import { cn } from '@/lib/utils';

export type View =
  | { kind: 'overview' }
  | { kind: 'directory'; tab: DirectoryTab }
  | { kind: 'people' }
  | { kind: 'project'; id: string };

const navItem =
  'group flex w-full items-center gap-300 rounded-lg px-300 py-200 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Sidebar({
  projects,
  tasksByProject,
  activeCount,
  archivedCount,
  peopleCount,
  view,
  loading,
  userName,
  userEmail,
  onNavigate,
  onNewProject,
}: {
  /** Active projects the signed-in person is on. */
  projects: readonly ProjectRecord[];
  tasksByProject: ReadonlyMap<string, readonly TaskRecord[]>;
  /** Directory counts across the whole company. */
  activeCount: number;
  archivedCount: number;
  peopleCount: number;
  view: View;
  loading: boolean;
  userName: string;
  userEmail: string;
  onNavigate(view: View): void;
  onNewProject(): void;
}) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-500 pt-600 pb-500">
        <img
          src={logoOnDark}
          alt="Reliance Infosystems"
          className="h-1200 w-auto"
        />
        <Eyebrow className="mt-300 text-sidebar-muted">Project workspace</Eyebrow>
      </div>

      <nav aria-label="Workspace" className="flex min-h-0 flex-1 flex-col px-300">
        <div className="flex flex-col gap-100">
          <NavButton
            icon={<LayoutGrid aria-hidden="true" className="icon-size-200" />}
            label="Portfolio"
            current={view.kind === 'overview'}
            onClick={() => onNavigate({ kind: 'overview' })}
          />
          <NavButton
            icon={<Library aria-hidden="true" className="icon-size-200" />}
            label="All projects"
            count={activeCount}
            current={view.kind === 'directory' && view.tab === 'active'}
            onClick={() => onNavigate({ kind: 'directory', tab: 'active' })}
          />
          <NavButton
            icon={<Archive aria-hidden="true" className="icon-size-200" />}
            label="Archived"
            count={archivedCount}
            current={view.kind === 'directory' && view.tab === 'archived'}
            onClick={() => onNavigate({ kind: 'directory', tab: 'archived' })}
          />
          <NavButton
            icon={<Users aria-hidden="true" className="icon-size-200" />}
            label="People"
            count={peopleCount}
            current={view.kind === 'people'}
            onClick={() => onNavigate({ kind: 'people' })}
          />
        </div>

        <div className="mt-600 mb-200 flex items-center justify-between px-300">
          <Eyebrow className="text-sidebar-muted">Your projects</Eyebrow>
          <button
            type="button"
            onClick={onNewProject}
            aria-label="New project"
            title="New project"
            className="rounded-md p-100 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus aria-hidden="true" className="icon-size-200" />
          </button>
        </div>

        <div className="-mx-100 min-h-0 flex-1 overflow-y-auto px-100 pb-400">
          {loading ? (
            <div role="status" aria-label="Loading projects" className="flex flex-col gap-200 px-300">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1000 animate-pulse rounded-lg bg-sidebar-accent" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="px-300 py-200 text-200 leading-200 text-sidebar-muted">
              You're not on any active projects. Create one, or ask a project
              manager to add you.
            </p>
          ) : (
            <ul className="flex flex-col gap-100">
              {projects.map((project) => {
                const progress = progressOf(tasksByProject.get(project.id) ?? []);
                const active = view.kind === 'project' && view.id === project.id;
                const pending = isPending(project);
                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onNavigate({ kind: 'project', id: project.id })}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        navItem,
                        'relative flex-col items-stretch gap-200-nudge',
                        active ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent',
                        pending && 'opacity-60',
                        project.status === 'completed' && !active && 'opacity-70'
                      )}
                    >
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-300 left-none w-100 rounded-full bg-primary"
                        />
                      ) : null}
                      <span className="flex items-center gap-200">
                        <span
                          aria-hidden="true"
                          className={cn('size-200-nudge shrink-0 rounded-full', projectTone(project.status).dot)}
                        />
                        <span className="min-w-0 flex-1 truncate text-300 leading-300 font-medium text-sidebar-foreground">
                          {project.name}
                        </span>
                        <span className="font-numeric text-200 leading-200 text-sidebar-muted">
                          {progress.total === 0 ? '—' : `${progress.percent}%`}
                        </span>
                      </span>
                      <CapsuleMeter
                        done={progress.done}
                        total={progress.total}
                        segments={10}
                        onDark
                        label={`${project.name} progress`}
                        className="pl-400"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </nav>

      <div className="flex items-center gap-300 border-t border-sidebar-border px-500 py-400">
        <span
          aria-hidden="true"
          className="inline-flex size-800 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-200 font-semibold text-primary-foreground"
        >
          {initials(userName) || '·'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-300 leading-300 font-semibold">
            {userName || 'Signed in'}
          </p>
          {userEmail ? (
            <p className="truncate text-200 leading-200 text-sidebar-muted">
              {userEmail}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Light theme' : 'Dark theme'}
          className="rounded-md p-200-nudge text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isDark ? (
            <Sun aria-hidden="true" className="icon-size-200" />
          ) : (
            <Moon aria-hidden="true" className="icon-size-200" />
          )}
        </button>
      </div>
    </div>
  );
}

function NavButton({
  icon,
  label,
  count,
  current,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  current: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cn(
        navItem,
        'text-[length:var(--text-300)] font-semibold',
        current
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {count !== undefined ? (
        <span className="font-numeric text-200 leading-200 font-normal text-sidebar-muted">
          {count}
        </span>
      ) : null}
    </button>
  );
}
