//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
  ContributorRecord,
  ProjectRecord,
  ProjectRole,
  TaskRecord,
  TaskStatus,
  UserRecord,
} from '@rayfin-app/shared';
import { ChevronRight, Menu, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import logoOnDark from '@/assets/reliance-logo-dark.png';
import { ClaimDialog, type ClaimDraft } from '@/components/ClaimDialog';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ContributorDialog } from '@/components/ContributorDialog';
import { Directory } from '@/components/Directory';
import { Overview } from '@/components/Overview';
import { People } from '@/components/People';
import { PersonDialog } from '@/components/PersonDialog';
import type { PersonInput } from '@/components/PersonPicker';
import { ProjectDialog, type ProjectDraft } from '@/components/ProjectDialog';
import { ProjectView } from '@/components/ProjectView';
import { Sidebar, type View } from '@/components/Sidebar';
import {
  TaskDialog,
  type ReadOnlyReason,
  type TaskDraft,
} from '@/components/TaskDialog';
import { ErrorState, LoadingState } from '@/components/states';
import { Button } from '@/components/ui';
import { useCrud, type MutationResult } from '@/components/useCrud';
import { useAuth } from '@/hooks/auth.context';
import {
  canEditTask,
  canManage,
  contributorsOf,
  findUserByEmail,
  isUnclaimed,
  leadershipOf,
  normalizeEmail,
  normalizeName,
  roleOn,
  sameEmail,
  sameLeadership,
  teamOf,
  type TeamMember,
} from '@/lib/access';
import { localTodayYmd } from '@/lib/dates';
import { describeError } from '@/lib/errors';
import { nameFromEmail } from '@/lib/people';
import { compareProjects, groupByProject } from '@/lib/portfolio';
import {
  claimLegacyTasks,
  contributorApi,
  copyLeadershipToChildren,
  deleteProjectWithChildren,
  lookupUserByEmail,
  projectApi,
  removeContributorFromProject,
  taskApi,
  userApi,
} from '@/lib/records';
import { cn } from '@/lib/utils';

type TaskDialogState =
  | { task: TaskRecord }
  | { projectId: string; status: TaskStatus };

type ConfirmState =
  | { kind: 'delete-project'; project: ProjectRecord }
  | {
      kind: 'remove-contributor';
      project: ProjectRecord;
      member: TeamMember & { contributor: ContributorRecord };
    };

const APP_TITLE = 'Reliance Projects';
const NO_CONTRIBUTORS: readonly ContributorRecord[] = [];
const NO_TASKS: readonly TaskRecord[] = [];

function App() {
  const { session } = useAuth();
  const sessionEmail = session?.user?.email ?? '';
  const me = normalizeEmail(sessionEmail);

  const users = useCrud<UserRecord>(userApi);
  const projects = useCrud<ProjectRecord>(projectApi);
  const contributors = useCrud<ContributorRecord>(contributorApi);
  const tasks = useCrud<TaskRecord>(taskApi);
  const lists = [users, projects, contributors, tasks];

  const [view, setView] = useState<View>({ kind: 'overview' });
  const [navOpen, setNavOpen] = useState(false);
  const [projectDialog, setProjectDialog] = useState<{
    project?: ProjectRecord;
  } | null>(null);
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [contributorDialogFor, setContributorDialogFor] =
    useState<ProjectRecord | null>(null);
  const [claimDialogFor, setClaimDialogFor] = useState<ProjectRecord | null>(
    null
  );
  const [personDialog, setPersonDialog] = useState<{
    rename?: UserRecord;
  } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [syncing, setSyncing] = useState(false);

  const today = localTodayYmd();
  const loading = lists.some((l) => l.status === 'loading');
  const failed = lists.some((l) => l.status === 'error');

  const sortedUsers = useMemo(
    () =>
      [...users.items].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', undefined, {
          sensitivity: 'base',
        })
      ),
    [users.items]
  );
  const usersById = useMemo(
    () => new Map(users.items.map((u) => [u.id, u])),
    [users.items]
  );
  const meUser = findUserByEmail(users.items, me);
  const myName = meUser?.name || nameFromEmail(sessionEmail);

  const sortedProjects = useMemo(
    () => [...projects.items].sort(compareProjects),
    [projects.items]
  );
  const contributorsByProject = useMemo(
    () =>
      new Map(
        projects.items.map((p) => [p.id, contributorsOf(p, contributors.items)])
      ),
    [projects.items, contributors.items]
  );
  const teams = useMemo(
    () =>
      new Map(
        projects.items.map((p) => [
          p.id,
          teamOf(p, contributorsByProject.get(p.id) ?? NO_CONTRIBUTORS, usersById),
        ])
      ),
    [projects.items, contributorsByProject, usersById]
  );
  const roles = useMemo(
    () =>
      new Map<string, ProjectRole | null>(
        projects.items.map((p) => [
          p.id,
          roleOn(p, contributorsByProject.get(p.id) ?? NO_CONTRIBUTORS, usersById, me),
        ])
      ),
    [projects.items, contributorsByProject, usersById, me]
  );
  const teamSizes = useMemo(
    () => new Map([...teams].map(([id, team]) => [id, team.length])),
    [teams]
  );
  const tasksByProject = useMemo(
    () => groupByProject(tasks.items),
    [tasks.items]
  );

  const myActiveProjects = useMemo(
    () => sortedProjects.filter((p) => !p.archived && roles.get(p.id)),
    [sortedProjects, roles]
  );
  // Everything on projects you run, plus whatever is assigned to you.
  const myWork = useMemo(() => {
    const active = new Set(myActiveProjects.map((p) => p.id));
    return tasks.items.filter(
      (t) =>
        active.has(t.project_id) &&
        (canManage(roles.get(t.project_id) ?? null) ||
          sameEmail(t.assignee_email, me))
    );
  }, [myActiveProjects, tasks.items, roles, me]);
  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects.items) {
      if (p.archived) continue;
      for (const member of teams.get(p.id) ?? []) {
        counts.set(member.userId, (counts.get(member.userId) ?? 0) + 1);
      }
    }
    return counts;
  }, [projects.items, teams]);
  const archivedCount = projects.items.filter((p) => p.archived).length;
  const unclaimedCount = projects.items.filter(
    (p) => isUnclaimed(p) && !p.archived
  ).length;

  // A project someone deleted falls back to the portfolio.
  const selected =
    view.kind === 'project'
      ? projects.items.find((p) => p.id === view.id)
      : undefined;
  const activeView: View =
    view.kind === 'project' && !selected ? { kind: 'overview' } : view;

  useEffect(() => {
    document.title = selected ? `${selected.name} · ${APP_TITLE}` : APP_TITLE;
  }, [selected]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  function navigate(next: View) {
    setView(next);
    setNavOpen(false);
  }

  function clearErrors() {
    for (const list of lists) list.clearError();
  }

  function closeDialogs() {
    setProjectDialog(null);
    setTaskDialog(null);
    setContributorDialogFor(null);
    setClaimDialogFor(null);
    setPersonDialog(null);
    setConfirm(null);
    // A failure already shown inside the dialog should not reappear behind it.
    clearErrors();
  }

  function quietRefresh(...which: typeof lists) {
    return Promise.all(which.map((l) => l.refresh({ quiet: true })));
  }

  async function sync() {
    setSyncing(true);
    await quietRefresh(...lists);
    setSyncing(false);
  }

  function retryLoad() {
    for (const list of lists) void list.refresh();
  }

  function failure(error: unknown): { ok: false; error: string } {
    console.error(error);
    return { ok: false, error: describeError(error) };
  }

  /**
   * The directory entry for a person picked in a form, adding them first
   * when they are new. Throws when they cannot be added.
   */
  async function resolveUser(person: PersonInput): Promise<UserRecord> {
    const email = normalizeEmail(person.email);
    const known = findUserByEmail(users.items, email);
    if (known && !known.id.startsWith('pending-')) return known;
    const result = await users.create({
      email,
      name: person.name.trim() || nameFromEmail(email),
    });
    if (result.ok) return result.value;
    // A colleague may have added the same email since the list loaded.
    const existing = await lookupUserByEmail(email);
    if (existing) {
      users.clearError();
      void users.refresh({ quiet: true });
      return existing;
    }
    throw new Error(result.error);
  }

  async function addPerson(input: { name: string; email: string }) {
    return users.create(input);
  }

  async function saveProject(
    draft: ProjectDraft,
    existing?: ProjectRecord
  ): Promise<MutationResult<unknown>> {
    let manager: UserRecord | null;
    let lead: UserRecord | null;
    try {
      manager = draft.manager ? await resolveUser(draft.manager) : null;
      lead = draft.lead ? await resolveUser(draft.lead) : null;
    } catch (error) {
      return failure(error);
    }
    const fields = {
      ...draft.fields,
      manager_id: manager?.id ?? null,
      manager_email: manager ? normalizeEmail(manager.email) : null,
      lead_id: lead?.id ?? null,
      lead_email: lead ? normalizeEmail(lead.email) : null,
    };

    if (!existing) {
      const result = await projects.create({
        ...fields,
        archived: false,
        legacy: false,
        createdAt: new Date(),
      });
      if (result.ok) navigate({ kind: 'project', id: result.value.id });
      return result;
    }

    const handover = !sameLeadership(existing, fields);
    if (handover) {
      // Children first: their policies still name the caller until rewritten,
      // and the project row stays editable for a retry if a later step fails.
      try {
        await copyLeadershipToChildren(existing, leadershipOf(fields));
      } catch (error) {
        await quietRefresh(contributors, tasks);
        return failure(error);
      }
    }
    const result = await projects.update(existing.id, fields);
    if (handover) await quietRefresh(contributors, tasks);
    return result;
  }

  /** Distinct free-text assignee names still on a project's old tasks. */
  function legacyAssigneesOf(project: ProjectRecord): string[] {
    const names = new Map<string, string>();
    for (const task of tasksByProject.get(project.id) ?? []) {
      if (!task.legacy || task.assignee_id || !task.assignee?.trim()) continue;
      const key = normalizeName(task.assignee);
      if (!names.has(key)) names.set(key, task.assignee.trim());
    }
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Claims a project from before roles existed. Its old tasks are brought
   * across first — linking their free-text assignees to people, who join the
   * team — and the project's own legacy flag is cleared last, so a failure
   * part-way through leaves it claimable for a retry.
   */
  async function claimProject(
    project: ProjectRecord,
    draft: ClaimDraft
  ): Promise<MutationResult<unknown>> {
    let manager: UserRecord | null;
    let lead: UserRecord | null;
    try {
      manager = draft.manager ? await resolveUser(draft.manager) : null;
      lead = draft.lead ? await resolveUser(draft.lead) : null;
      const people = new Map<string, UserRecord>();
      for (const { name, person } of draft.assignees) {
        if (person) people.set(normalizeName(name), await resolveUser(person));
      }
      const leaders = new Set([manager?.id, lead?.id]);
      const contributorIds = [
        ...new Set([...people.values()].map((u) => u.id)),
      ].filter((id) => !leaders.has(id));
      await claimLegacyTasks(
        project.id,
        leadershipOf({
          manager_email: manager?.email ?? null,
          lead_email: lead?.email ?? null,
        }),
        (legacyName) => {
          const user = people.get(normalizeName(legacyName));
          return user ? { id: user.id, email: normalizeEmail(user.email) } : undefined;
        },
        contributorIds
      );
    } catch (error) {
      await quietRefresh(contributors, tasks);
      return failure(error);
    }
    const result = await projects.update(project.id, {
      manager_id: manager?.id ?? null,
      manager_email: manager ? normalizeEmail(manager.email) : null,
      lead_id: lead?.id ?? null,
      lead_email: lead ? normalizeEmail(lead.email) : null,
      legacy: false,
      // The free-text lead is kept unless a real lead replaced it.
      ...(lead ? { lead: null } : {}),
    });
    await quietRefresh(contributors, tasks);
    return result;
  }

  async function deleteProject(
    project: ProjectRecord
  ): Promise<MutationResult<unknown>> {
    try {
      await deleteProjectWithChildren(project);
      navigate({ kind: 'overview' });
      return { ok: true, value: undefined };
    } catch (error) {
      return failure(error);
    } finally {
      // Re-read everything: a partial failure may have removed some rows.
      await quietRefresh(projects, contributors, tasks);
    }
  }

  async function addContributor(
    project: ProjectRecord,
    person: PersonInput
  ): Promise<MutationResult<unknown>> {
    let user: UserRecord;
    try {
      user = await resolveUser(person);
    } catch (error) {
      return failure(error);
    }
    return contributors.create({
      project_id: project.id,
      user_id: user.id,
      ...leadershipOf(project),
      createdAt: new Date(),
    });
  }

  async function removeContributor(
    project: ProjectRecord,
    contributor: ContributorRecord
  ): Promise<MutationResult<unknown>> {
    try {
      await removeContributorFromProject(project, contributor);
      return { ok: true, value: undefined };
    } catch (error) {
      return failure(error);
    } finally {
      await quietRefresh(contributors, tasks);
    }
  }

  function saveTask(
    draft: TaskDraft,
    project: ProjectRecord,
    existing?: TaskRecord
  ): Promise<MutationResult<unknown>> {
    if (existing) return tasks.update(existing.id, draft);
    return tasks.create({
      ...draft,
      legacy: false,
      project_id: project.id,
      ...leadershipOf(project),
      createdAt: new Date(),
    });
  }

  function quickAdd(project: ProjectRecord, title: string) {
    // Contributors can only hold tasks themselves; managers add them unassigned.
    const mine = !canManage(roles.get(project.id) ?? null) && meUser;
    return tasks.create({
      title,
      status: 'todo',
      priority: 'medium',
      legacy: false,
      assignee_id: mine ? meUser.id : null,
      assignee_email: mine ? me : null,
      project_id: project.id,
      ...leadershipOf(project),
      createdAt: new Date(),
    });
  }

  const dialogOpen =
    projectDialog ||
    taskDialog ||
    contributorDialogFor ||
    claimDialogFor ||
    personDialog ||
    confirm;
  const bannerError =
    !failed && !loading && !dialogOpen
      ? (users.error ?? projects.error ?? contributors.error ?? tasks.error)
      : null;

  const sidebar = (
    <Sidebar
      projects={myActiveProjects}
      tasksByProject={tasksByProject}
      activeCount={projects.items.length - archivedCount}
      archivedCount={archivedCount}
      peopleCount={users.items.length}
      view={activeView}
      loading={loading}
      userName={myName}
      userEmail={sessionEmail}
      onNavigate={navigate}
      onNewProject={() => {
        setNavOpen(false);
        setProjectDialog({});
      }}
    />
  );

  // Everything the open task dialog needs about its project.
  const taskContext = (() => {
    if (!taskDialog) return null;
    const projectId =
      'task' in taskDialog ? taskDialog.task.project_id : taskDialog.projectId;
    const project = projects.items.find((p) => p.id === projectId);
    if (!project) return null;
    const role = roles.get(project.id) ?? null;
    const task = 'task' in taskDialog ? taskDialog.task : undefined;
    const readOnly: ReadOnlyReason | null = project.archived
      ? 'archived'
      : (task ? !canEditTask(task, role, me) : role === null)
        ? 'not-yours'
        : null;
    return {
      project,
      role,
      task,
      readOnly,
      status: 'status' in taskDialog ? taskDialog.status : undefined,
      team: teams.get(project.id) ?? [],
    };
  })();

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-none hidden h-screen w-sidebar shrink-0 md:block">
        {sidebar}
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div id="mobile-nav" className="h-full w-sidebar max-w-[85%] shadow-2xl">
            {sidebar}
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="flex-1 bg-scrim"
            onClick={() => setNavOpen(false)}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-none z-30 flex items-center justify-between bg-sidebar px-400 py-300 md:hidden">
          <img src={logoOnDark} alt="Reliance Infosystems" className="h-800 w-auto" />
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            className="rounded-md p-200 text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu aria-hidden="true" className="icon-size-300" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-content flex-1 px-400 py-600 md:px-800 md:py-800">
          <div className="mb-600 flex items-center justify-between gap-300">
            <Breadcrumb view={activeView} project={selected} onNavigate={navigate} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void sync()}
              disabled={syncing || loading || failed || lists.some((l) => l.pending)}
              title="Load the latest changes from your team"
            >
              <RefreshCw
                aria-hidden="true"
                className={cn('icon-size-100', syncing && 'animate-spin')}
              />
              {syncing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {bannerError ? (
            <div className="mb-600">
              <ErrorState message={bannerError} onDismiss={clearErrors} />
            </div>
          ) : null}

          {failed ? (
            <ErrorState
              title="Couldn't load your projects"
              message={
                users.error ??
                projects.error ??
                contributors.error ??
                tasks.error ??
                'Something went wrong while loading. Please try again.'
              }
              onRetry={retryLoad}
            />
          ) : loading ? (
            <div className="flex flex-col gap-600">
              <div className="flex flex-col gap-200">
                <div className="h-400 w-1/5 animate-pulse rounded-md bg-muted" />
                <div className="h-1000 w-2/5 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="h-[calc(var(--spacing-1200)*2.5)] animate-pulse rounded-2xl bg-muted" />
              <LoadingState rows={4} />
            </div>
          ) : selected ? (
            <ProjectView
              project={selected}
              role={roles.get(selected.id) ?? null}
              me={me}
              meUserId={meUser?.id ?? null}
              team={teams.get(selected.id) ?? []}
              users={usersById}
              tasks={tasksByProject.get(selected.id) ?? NO_TASKS}
              today={today}
              onEditProject={() => setProjectDialog({ project: selected })}
              onClaim={() => setClaimDialogFor(selected)}
              onToggleArchive={() =>
                void projects.update(selected.id, { archived: !selected.archived })
              }
              onDeleteProject={() =>
                setConfirm({ kind: 'delete-project', project: selected })
              }
              onAddContributor={() => setContributorDialogFor(selected)}
              onRemoveContributor={(member) =>
                setConfirm({ kind: 'remove-contributor', project: selected, member })
              }
              onNewTask={(status) => setTaskDialog({ projectId: selected.id, status })}
              onOpenTask={(task) => setTaskDialog({ task })}
              onMoveTask={(task, status) => void tasks.update(task.id, { status })}
              onQuickAdd={(title) => quickAdd(selected, title)}
            />
          ) : activeView.kind === 'directory' ? (
            <Directory
              projects={sortedProjects}
              users={usersById}
              roles={roles}
              teamSizes={teamSizes}
              tab={activeView.tab}
              onTabChange={(tab) => navigate({ kind: 'directory', tab })}
              onOpenProject={(id) => navigate({ kind: 'project', id })}
              onNewProject={() => setProjectDialog({})}
            />
          ) : activeView.kind === 'people' ? (
            <People
              users={sortedUsers}
              meUserId={meUser?.id ?? null}
              projectCounts={projectCounts}
              onAdd={() => setPersonDialog({})}
              onRenameMe={() => meUser && setPersonDialog({ rename: meUser })}
            />
          ) : (
            <Overview
              projects={myActiveProjects}
              tasks={myWork}
              tasksByProject={tasksByProject}
              roles={roles}
              users={usersById}
              today={today}
              userName={myName}
              unclaimedCount={unclaimedCount}
              onOpenProject={(id) => navigate({ kind: 'project', id })}
              onOpenTask={(task) => setTaskDialog({ task })}
              onNewProject={() => setProjectDialog({})}
              onBrowse={() => navigate({ kind: 'directory', tab: 'active' })}
            />
          )}
        </main>
      </div>

      {projectDialog ? (
        <ProjectDialog
          key={projectDialog.project?.id ?? 'new'}
          project={projectDialog.project}
          users={sortedUsers}
          usersById={usersById}
          me={me}
          myName={myName}
          onClose={closeDialogs}
          onSave={(draft) => saveProject(draft, projectDialog.project)}
        />
      ) : null}

      {taskContext ? (
        <TaskDialog
          key={taskContext.task?.id ?? 'new'}
          task={taskContext.task}
          defaultStatus={taskContext.status}
          projectName={taskContext.project.name}
          team={taskContext.team}
          users={usersById}
          role={taskContext.role}
          meUserId={meUser?.id ?? null}
          me={me}
          readOnly={taskContext.readOnly}
          onClose={closeDialogs}
          onSave={(draft) => saveTask(draft, taskContext.project, taskContext.task)}
          onDelete={
            taskContext.task ? () => tasks.remove(taskContext.task!.id) : undefined
          }
        />
      ) : null}

      {contributorDialogFor ? (
        <ContributorDialog
          projectName={contributorDialogFor.name}
          team={teams.get(contributorDialogFor.id) ?? []}
          users={sortedUsers}
          onClose={closeDialogs}
          onAdd={(person) => addContributor(contributorDialogFor, person)}
        />
      ) : null}

      {claimDialogFor ? (
        <ClaimDialog
          project={claimDialogFor}
          legacyAssignees={legacyAssigneesOf(claimDialogFor)}
          users={sortedUsers}
          me={me}
          myName={myName}
          onClose={closeDialogs}
          onClaim={(draft) => claimProject(claimDialogFor, draft)}
        />
      ) : null}

      {personDialog ? (
        <PersonDialog
          person={personDialog.rename}
          users={users.items}
          onClose={closeDialogs}
          onSave={(input) =>
            personDialog.rename
              ? users.update(personDialog.rename.id, { name: input.name })
              : addPerson(input)
          }
        />
      ) : null}

      {confirm?.kind === 'delete-project' ? (
        <ConfirmModal
          title="Delete project"
          eyebrow={confirm.project.name}
          confirmLabel="Delete project"
          pendingLabel="Deleting…"
          destructive
          onClose={closeDialogs}
          onConfirm={() => deleteProject(confirm.project)}
        >
          <p>
            Delete <strong>{confirm.project.name}</strong>, its team list, and
            all of its tasks? This can't be undone.
          </p>
          <p className="text-muted-foreground">
            To keep the history, move it to the archive instead.
          </p>
        </ConfirmModal>
      ) : null}

      {confirm?.kind === 'remove-contributor' ? (
        <ConfirmModal
          title="Remove from team"
          eyebrow={confirm.project.name}
          confirmLabel="Remove"
          pendingLabel="Removing…"
          destructive
          onClose={closeDialogs}
          onConfirm={() => removeContributor(confirm.project, confirm.member.contributor)}
        >
          <p>
            Remove <strong>{confirm.member.name}</strong> from{' '}
            {confirm.project.name}?
          </p>
          <p className="text-muted-foreground">
            Their tasks on this project become unassigned, so they can no longer
            change them. You can reassign the tasks afterwards.
          </p>
        </ConfirmModal>
      ) : null}
    </div>
  );
}

function Breadcrumb({
  view,
  project,
  onNavigate,
}: {
  view: View;
  project?: ProjectRecord;
  onNavigate(view: View): void;
}) {
  const trail: { label: string; to?: View }[] =
    view.kind === 'overview'
      ? [{ label: 'Portfolio' }]
      : view.kind === 'people'
        ? [{ label: 'Portfolio', to: { kind: 'overview' } }, { label: 'People' }]
        : view.kind === 'directory'
          ? [
              { label: 'Portfolio', to: { kind: 'overview' } },
              { label: view.tab === 'archived' ? 'Archived projects' : 'All projects' },
            ]
          : [
              { label: 'Portfolio', to: { kind: 'overview' } },
              {
                label: project?.archived ? 'Archived projects' : 'All projects',
                to: { kind: 'directory', tab: project?.archived ? 'archived' : 'active' },
              },
              { label: project?.name ?? 'Project' },
            ];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-100 text-200 leading-200 text-muted-foreground">
        {trail.map((crumb, index) => (
          <li key={crumb.label} className="flex min-w-0 items-center gap-100">
            {index > 0 ? (
              <ChevronRight aria-hidden="true" className="icon-size-100 shrink-0" />
            ) : null}
            {crumb.to ? (
              <button
                type="button"
                onClick={() => onNavigate(crumb.to!)}
                className="shrink-0 rounded-md font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {crumb.label}
              </button>
            ) : (
              <span aria-current="page" className="truncate font-medium text-foreground">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default App;
