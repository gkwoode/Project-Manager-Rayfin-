//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type {
  ContributorRecord,
  ProjectRecord,
  TaskRecord,
  UserRecord,
} from '@rayfin-app/shared';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '@/hooks/auth.context';

const records = vi.hoisted(() => ({
  users: [] as UserRecord[],
  projects: [] as ProjectRecord[],
  contributors: [] as ContributorRecord[],
  tasks: [] as TaskRecord[],
  failProjects: false,
}));

const api = vi.hoisted(() => ({
  updateProject: vi.fn(),
  claimLegacyTasks: vi.fn(async () => {}),
}));

vi.mock('@/lib/records', () => ({
  userApi: {
    list: vi.fn(async () => records.users),
    create: vi.fn(async (input: Omit<UserRecord, 'id'>) => ({ ...input, id: 'u-new' })),
    update: vi.fn(),
    remove: vi.fn(),
  },
  projectApi: {
    list: vi.fn(async () => {
      if (records.failProjects) throw new Error('403 Forbidden');
      return records.projects;
    }),
    create: vi.fn(async (input: Omit<ProjectRecord, 'id'>) => ({ ...input, id: 'p-new' })),
    update: api.updateProject,
    remove: vi.fn(),
  },
  contributorApi: {
    list: vi.fn(async () => records.contributors),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  taskApi: {
    list: vi.fn(async () => records.tasks),
    create: vi.fn(async (input: Omit<TaskRecord, 'id'>) => ({ ...input, id: 't-new' })),
    update: vi.fn(async (id: string, patch: Partial<TaskRecord>) => ({
      ...records.tasks.find((t) => t.id === id)!,
      ...patch,
    })),
    remove: vi.fn(),
  },
  lookupUserByEmail: vi.fn(),
  claimLegacyTasks: api.claimLegacyTasks,
  deleteProjectWithChildren: vi.fn(),
  copyLeadershipToChildren: vi.fn(),
  removeContributorFromProject: vi.fn(),
}));

import App from '@/App';

const MANAGER = 'ada.obi@reliance.example';
const CONTRIBUTOR = 'kemi.adeyemi@reliance.example';
const OUTSIDER = 'bola.ade@reliance.example';

function authFor(email: string): AuthContextValue {
  return {
    session: {
      user: { id: `id-${email}`, email },
      isAuthenticated: true,
      isAnonymous: false,
    },
    isAuthenticated: true,
    isLoading: false,
    canSignIn: true,
    signIn: async () => {},
    isSigningIn: false,
    signInError: null,
    config: { kind: 'ready' },
    error: null,
  };
}

function renderAs(email: string, children: ReactNode = <App />) {
  return act(async () =>
    render(
      <AuthContext.Provider value={authFor(email)}>{children}</AuthContext.Provider>
    )
  );
}

const created = new Date('2026-09-01T09:00:00Z');
const leadership = { manager_email: MANAGER, lead_email: null };

beforeEach(() => {
  records.failProjects = false;
  api.updateProject.mockReset();
  api.updateProject.mockImplementation(async (id: string, patch: Partial<ProjectRecord>) => ({
    ...records.projects.find((p) => p.id === id)!,
    ...patch,
  }));
  records.users = [
    { id: 'u-ada', name: 'Ada Obi', email: MANAGER },
    { id: 'u-kemi', name: 'Kemi Adeyemi', email: CONTRIBUTOR },
    { id: 'u-tunde', name: 'Tunde Bello', email: 'tunde.bello@reliance.example' },
  ];
  records.projects = [
    {
      id: 'p-1',
      name: 'Dynamics 365 rollout',
      client: 'Zenith Bank',
      status: 'active',
      archived: false,
      legacy: false,
      manager_id: 'u-ada',
      manager_email: MANAGER,
      dueDate: new Date('2099-12-15T00:00:00Z'),
      createdAt: created,
    },
  ];
  records.contributors = [
    { id: 'c-1', project_id: 'p-1', user_id: 'u-kemi', ...leadership, createdAt: created },
    { id: 'c-2', project_id: 'p-1', user_id: 'u-tunde', ...leadership, createdAt: created },
  ];
  records.tasks = [
    {
      id: 't-1',
      title: 'Map finance workflows',
      status: 'done',
      priority: 'high',
      legacy: false,
      assignee_id: 'u-tunde',
      assignee_email: 'tunde.bello@reliance.example',
      project_id: 'p-1',
      ...leadership,
      createdAt: created,
    },
    {
      id: 't-2',
      title: 'Configure approvals',
      status: 'in-progress',
      priority: 'urgent',
      legacy: false,
      assignee_id: 'u-kemi',
      assignee_email: CONTRIBUTOR,
      dueDate: '2000-01-03T00:00:00.000Z' as unknown as Date,
      project_id: 'p-1',
      ...leadership,
      createdAt: created,
    },
  ];
});

async function openProject() {
  await act(async () =>
    fireEvent.click(screen.getByRole('heading', { name: 'Dynamics 365 rollout' }))
  );
}

function card(title: string) {
  return screen.getByText(title).closest('[role="button"]') as HTMLElement;
}

describe('App', () => {
  it("summarises the signed-in person's projects", async () => {
    await renderAs(MANAGER);

    expect(await screen.findByRole('heading', { name: 'Portfolio' })).toBeVisible();
    const summary = screen.getByRole('region', { name: 'Portfolio summary' });
    expect(within(summary).getByText('Active projects').nextSibling).toHaveTextContent('1');
    expect(within(summary).getByText('Overdue').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('1 of 2 tasks done')).toBeVisible();
    expect(screen.getByText(/, Ada\. Here's where/)).toBeVisible();
  });

  it('gives the project manager the board, team, and project controls', async () => {
    await renderAs(MANAGER);
    await openProject();

    const toolbar = screen.getByRole('toolbar', { name: 'Manage project' });
    expect(within(toolbar).getByRole('button', { name: /Move to archive/ })).toBeVisible();
    expect(within(toolbar).getByRole('button', { name: /Delete project/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Add contributor/ })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Remove Kemi Adeyemi from the team' })
    ).toBeVisible();

    const inProgress = screen.getByRole('group', { name: /^In progress/ });
    expect(within(inProgress).getByText('Configure approvals')).toBeVisible();
    expect(within(inProgress).getByText('Kemi Adeyemi')).toBeVisible();
    expect(card('Map finance workflows')).toHaveAttribute('draggable', 'true');
  });

  it('moves a project to the archive', async () => {
    await renderAs(MANAGER);
    await openProject();

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: /Move to archive/ }))
    );

    expect(api.updateProject).toHaveBeenCalledWith('p-1', { archived: true });
    expect(screen.getByText(/This project is archived/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Restore from archive/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'New task' })).toBeNull();
  });

  it("shows a contributor the whole board but lets them change only their own tasks", async () => {
    await renderAs(CONTRIBUTOR);
    await openProject();

    expect(screen.queryByRole('toolbar', { name: 'Manage project' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add contributor/ })).toBeNull();
    expect(screen.getByText(/the rest are view-only/)).toBeVisible();

    expect(card('Configure approvals')).toHaveAttribute('draggable', 'true');
    expect(card('Map finance workflows')).toHaveAttribute('draggable', 'false');

    await act(async () => fireEvent.click(card('Map finance workflows')));
    const dialog = screen.getByRole('dialog', { name: 'Task' });
    expect(within(dialog).getByText(/View only/)).toBeVisible();
    expect(within(dialog).queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(within(dialog).getByLabelText('Title')).toBeDisabled();
  });

  it('keeps the board to the team and leaves project controls to its leadership', async () => {
    await renderAs(OUTSIDER);

    expect(await screen.findByText("You're not on any projects yet")).toBeVisible();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: /Browse all projects/ }))
    );
    expect(screen.getByRole('heading', { name: 'All projects' })).toBeVisible();
    await act(async () => fireEvent.click(screen.getByText('Dynamics 365 rollout')));

    expect(screen.getByText("This board is for the project's team")).toBeVisible();
    expect(screen.queryByRole('button', { name: 'New task' })).toBeNull();
    expect(screen.queryByRole('toolbar', { name: 'Manage project' })).toBeNull();
  });

  it('lists the user directory', async () => {
    await renderAs(MANAGER);
    await act(async () =>
      fireEvent.click(screen.getAllByRole('button', { name: /^People/ })[0])
    );

    expect(screen.getByRole('heading', { name: 'People' })).toBeVisible();
    const table = screen.getByRole('table', { name: 'People in the directory' });
    expect(within(table).getAllByText(CONTRIBUTOR)[0]).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: /Edit your name/ })).toBeVisible();
  });

  it('lets anyone claim a project from before roles, keeping its tasks', async () => {
    records.projects.push({
      id: 'p-old',
      name: 'Legacy CRM upgrade',
      status: 'active',
      archived: false,
      legacy: true,
      lead: 'Tunde Bello',
      createdAt: created,
    });
    records.tasks.push(
      {
        id: 't-old-1',
        title: 'Export contacts',
        status: 'todo',
        priority: 'medium',
        legacy: true,
        assignee: 'Kemi Adeyemi',
        project_id: 'p-old',
        createdAt: created,
      },
      {
        id: 't-old-2',
        title: 'Brief the client',
        status: 'todo',
        priority: 'low',
        legacy: true,
        assignee: 'Someone Unknown',
        project_id: 'p-old',
        createdAt: created,
      }
    );
    await renderAs(OUTSIDER);

    expect(await screen.findByText(/1 project needs a/)).toBeVisible();
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Review projects' }))
    );
    expect(screen.getByText('Needs a manager')).toBeVisible();
    await act(async () => fireEvent.click(screen.getByText('Legacy CRM upgrade')));
    // Both old tasks show their free-text assignee as not yet linked to a person.
    expect(screen.getAllByText('not linked')).toHaveLength(2);

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Claim project' }))
    );
    const dialog = screen.getByRole('dialog', { name: 'Claim this project' });
    // The old lead and one old assignee match people in the directory by name.
    expect(within(dialog).getByLabelText('Project lead work email')).toHaveValue(
      'tunde.bello@reliance.example'
    );
    expect(within(dialog).getByLabelText('“Kemi Adeyemi” work email')).toHaveValue(
      CONTRIBUTOR
    );
    expect(within(dialog).getByLabelText('“Someone Unknown” work email')).toHaveValue('');

    await act(async () =>
      fireEvent.click(within(dialog).getByRole('button', { name: 'Claim project' }))
    );

    expect(api.claimLegacyTasks).toHaveBeenCalledTimes(1);
    const [projectId, leadership, personFor, contributorIds] =
      api.claimLegacyTasks.mock.calls[0] as unknown as [
        string,
        unknown,
        (name: string) => unknown,
        string[],
      ];
    expect(projectId).toBe('p-old');
    expect(leadership).toEqual({
      manager_email: OUTSIDER,
      lead_email: 'tunde.bello@reliance.example',
    });
    expect(personFor('kemi ADEYEMI')).toEqual({ id: 'u-kemi', email: CONTRIBUTOR });
    expect(personFor('Someone Unknown')).toBeUndefined();
    expect(contributorIds).toEqual(['u-kemi']);
    expect(api.updateProject).toHaveBeenCalledWith(
      'p-old',
      expect.objectContaining({
        legacy: false,
        manager_id: 'u-new',
        manager_email: OUTSIDER,
        lead_id: 'u-tunde',
        lead: null,
      })
    );
  });

  it('shows an actionable error instead of loading forever', async () => {
    records.failProjects = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderAs(MANAGER);

    expect(await screen.findByText("Couldn't load your projects")).toBeVisible();
    expect(
      screen.getByText("You don't have permission to do that in this workspace.")
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
