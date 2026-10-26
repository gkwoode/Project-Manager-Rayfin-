import type { PagedResult } from '@microsoft/rayfin-data';
import type {
  ContributorRecord,
  ProjectRecord,
  TaskRecord,
  UserRecord,
} from '@rayfin-app/shared';

import type { CrudApi } from '@/components/useCrud';

import { sameLeadership, type Leadership } from './access';
import { getRayfinClient } from './rayfin-client';

const PAGE_SIZE = 500;
/** A runaway cursor should fail loudly, not loop forever. */
const MAX_PAGES = 200;

/**
 * Reads every page of a collection. `.execute()` silently stops at one page,
 * and a team's task list will outgrow it.
 */
async function listAll<T>(
  fetchPage: (after: string | undefined) => Promise<PagedResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(cursor);
    rows.push(...result.items);
    if (!result.hasNextPage || !result.endCursor) return rows;
    cursor = result.endCursor;
  }
  throw new Error(`Stopped after ${MAX_PAGES} pages of results.`);
}

const USER_FIELDS: (keyof UserRecord)[] = ['id', 'name', 'email'];

const PROJECT_FIELDS: (keyof ProjectRecord)[] = [
  'id',
  'name',
  'client',
  'description',
  'status',
  'archived',
  'legacy',
  'lead',
  'dueDate',
  'manager_id',
  'manager_email',
  'lead_id',
  'lead_email',
  'createdAt',
];

const CONTRIBUTOR_FIELDS: (keyof ContributorRecord)[] = [
  'id',
  'project_id',
  'user_id',
  'manager_email',
  'lead_email',
  'createdAt',
];

const TASK_FIELDS: (keyof TaskRecord)[] = [
  'id',
  'title',
  'notes',
  'status',
  'priority',
  'legacy',
  'assignee',
  'assignee_id',
  'assignee_email',
  'manager_email',
  'lead_email',
  'dueDate',
  'createdAt',
  'project_id',
];

/**
 * Finds a directory entry by email on the service — used when adding someone
 * fails because a colleague added the same email since the list was loaded.
 */
export async function lookupUserByEmail(
  email: string
): Promise<UserRecord | undefined> {
  const client = await getRayfinClient();
  const rows = await client.data.AppUser.select(USER_FIELDS)
    .where({ email: { eq: email } })
    .first(1)
    .execute();
  return rows[0];
}

/** People are never deleted: projects and tasks point at them. */
export const userApi: CrudApi<UserRecord> = {
  async list() {
    const client = await getRayfinClient();
    return listAll((after) => {
      const query = client.data.AppUser.select(USER_FIELDS)
        .orderBy({ name: 'asc' })
        .first(PAGE_SIZE);
      return (after ? query.after(after) : query).executePaginated();
    });
  },
  async create(input) {
    return (await getRayfinClient()).data.AppUser.create(input);
  },
  async update(id, patch) {
    return (await getRayfinClient()).data.AppUser.update({ id }, patch);
  },
  async remove() {
    throw new Error('People cannot be removed from the directory.');
  },
};

export const projectApi: CrudApi<ProjectRecord> = {
  async list() {
    const client = await getRayfinClient();
    return listAll((after) => {
      const query = client.data.Project.select(PROJECT_FIELDS)
        .orderBy({ createdAt: 'asc' })
        .first(PAGE_SIZE);
      return (after ? query.after(after) : query).executePaginated();
    });
  },
  async create(input) {
    return (await getRayfinClient()).data.Project.create(input);
  },
  async update(id, patch) {
    return (await getRayfinClient()).data.Project.update({ id }, patch);
  },
  async remove(id) {
    await (await getRayfinClient()).data.Project.delete({ id });
  },
};

export const contributorApi: CrudApi<ContributorRecord> = {
  async list() {
    const client = await getRayfinClient();
    return listAll((after) => {
      const query = client.data.ProjectContributor.select(CONTRIBUTOR_FIELDS)
        .orderBy({ createdAt: 'asc' })
        .first(PAGE_SIZE);
      return (after ? query.after(after) : query).executePaginated();
    });
  },
  async create(input) {
    return (await getRayfinClient()).data.ProjectContributor.create(input);
  },
  async update(id, patch) {
    return (await getRayfinClient()).data.ProjectContributor.update(
      { id },
      patch
    );
  },
  async remove(id) {
    await (await getRayfinClient()).data.ProjectContributor.delete({ id });
  },
};

export const taskApi: CrudApi<TaskRecord> = {
  async list() {
    const client = await getRayfinClient();
    return listAll((after) => {
      const query = client.data.Task.select(TASK_FIELDS)
        .orderBy({ createdAt: 'asc' })
        .first(PAGE_SIZE);
      return (after ? query.after(after) : query).executePaginated();
    });
  },
  async create(input) {
    return (await getRayfinClient()).data.Task.create(input);
  },
  async update(id, patch) {
    return (await getRayfinClient()).data.Task.update({ id }, patch);
  },
  async remove(id) {
    await (await getRayfinClient()).data.Task.delete({ id });
  },
};

/**
 * A project's rows of one kind, read from the service rather than local
 * state so rows a teammate added since the last load are included. Only rows
 * carrying the project's current leadership are returned: those are the ones
 * its manager or lead is allowed to change.
 */
async function ownedTaskIds(project: ProjectRecord, assigneeId?: string) {
  const client = await getRayfinClient();
  const rows = await listAll((after) => {
    const query = client.data.Task.select(['id', 'manager_email', 'lead_email'])
      .where(
        assigneeId
          ? { project_id: { eq: project.id }, assignee_id: { eq: assigneeId } }
          : { project_id: { eq: project.id } }
      )
      .orderBy({ createdAt: 'asc' })
      .first(PAGE_SIZE);
    return (after ? query.after(after) : query).executePaginated();
  });
  return rows.filter((row) => sameLeadership(row, project));
}

async function ownedContributorIds(project: ProjectRecord) {
  const client = await getRayfinClient();
  const rows = await listAll((after) => {
    const query = client.data.ProjectContributor.select([
      'id',
      'manager_email',
      'lead_email',
    ])
      .where({ project_id: { eq: project.id } })
      .orderBy({ createdAt: 'asc' })
      .first(PAGE_SIZE);
    return (after ? query.after(after) : query).executePaginated();
  });
  return rows.filter((row) => sameLeadership(row, project));
}

/**
 * Deletes a project with its tasks and team, children first so nothing is
 * left pointing at a missing project.
 */
export async function deleteProjectWithChildren(
  project: ProjectRecord
): Promise<void> {
  const client = await getRayfinClient();
  for (const task of await ownedTaskIds(project)) {
    await client.data.Task.delete({ id: task.id });
  }
  for (const row of await ownedContributorIds(project)) {
    await client.data.ProjectContributor.delete({ id: row.id });
  }
  await client.data.Project.delete({ id: project.id });
}

/**
 * Rewrites the leadership copy on a project's tasks and team rows, so access
 * follows a new manager or lead. Run before saving the project: each row's
 * policy is checked against its current copy, which still names the caller.
 */
export async function copyLeadershipToChildren(
  project: ProjectRecord,
  next: Leadership
): Promise<void> {
  const client = await getRayfinClient();
  for (const task of await ownedTaskIds(project)) {
    await client.data.Task.update({ id: task.id }, next);
  }
  for (const row of await ownedContributorIds(project)) {
    await client.data.ProjectContributor.update({ id: row.id }, next);
  }
}

/**
 * The task side of claiming a project from before roles existed. Each of its
 * legacy tasks gets the new leadership copy and loses its legacy flag; a task
 * whose old free-text assignee maps to a person is linked to them. The people
 * mapped this way join the team as contributors.
 *
 * Runs before the project itself is claimed: legacy tasks are updatable by
 * anyone, and a contributor row is accepted because it names the claimer as
 * manager or lead.
 */
export async function claimLegacyTasks(
  projectId: string,
  leadership: Leadership,
  personFor: (legacyName: string) => { id: string; email: string } | undefined,
  contributorIds: readonly string[]
): Promise<void> {
  const client = await getRayfinClient();
  const rows = await listAll((after) => {
    const query = client.data.Task.select(['id', 'assignee'])
      .where({ project_id: { eq: projectId }, legacy: { eq: true } })
      .orderBy({ createdAt: 'asc' })
      .first(PAGE_SIZE);
    return (after ? query.after(after) : query).executePaginated();
  });
  for (const row of rows) {
    const person = row.assignee ? personFor(row.assignee) : undefined;
    await client.data.Task.update(
      { id: row.id },
      {
        ...leadership,
        legacy: false,
        ...(person
          ? { assignee_id: person.id, assignee_email: person.email, assignee: null }
          : {}),
      }
    );
  }
  for (const userId of contributorIds) {
    await client.data.ProjectContributor.create({
      project_id: projectId,
      user_id: userId,
      ...leadership,
      createdAt: new Date(),
    });
  }
}

/**
 * Takes someone off a project: their tasks there become unassigned (so they
 * can no longer change them and the manager can reassign them), then their
 * team row is removed.
 */
export async function removeContributorFromProject(
  project: ProjectRecord,
  contributor: ContributorRecord
): Promise<void> {
  const client = await getRayfinClient();
  for (const task of await ownedTaskIds(project, contributor.user_id)) {
    await client.data.Task.update(
      { id: task.id },
      { assignee_id: null, assignee_email: null }
    );
  }
  await client.data.ProjectContributor.delete({ id: contributor.id });
}
