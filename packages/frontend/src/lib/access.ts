import type {
  ContributorRecord,
  ProjectRecord,
  ProjectRole,
  TaskRecord,
  UserRecord,
} from '@rayfin-app/shared';

/**
 * Who can do what, as the app understands it. The service enforces the same
 * rules with row policies (see the entities in `@rayfin-app/data`); this
 * module decides what to offer in the UI so people are not shown actions the
 * service will refuse.
 */

export type UsersById = ReadonlyMap<string, UserRecord>;

export const ROLE_LABEL: Record<ProjectRole, string> = {
  manager: 'Project manager',
  lead: 'Project lead',
  contributor: 'Contributor',
};

/** Emails are stored and compared lower-cased and trimmed. */
export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function sameEmail(a: unknown, b: unknown): boolean {
  const left = normalizeEmail(a);
  return left !== '' && left === normalizeEmail(b);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function isEmail(value: unknown): boolean {
  return typeof value === 'string' && EMAIL.test(value.trim());
}

export function findUserByEmail(
  users: Iterable<UserRecord>,
  email: unknown
): UserRecord | undefined {
  for (const user of users) if (sameEmail(user.email, email)) return user;
  return undefined;
}

/** Names compare case-insensitively with spacing collapsed. */
export function normalizeName(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/gu, ' ').toLowerCase()
    : '';
}

/**
 * The directory entry whose name matches a free-text name from the first
 * version — only when exactly one person has that name, so an ambiguous
 * name is never linked to the wrong colleague.
 */
export function findUserByName(
  users: Iterable<UserRecord>,
  name: unknown
): UserRecord | undefined {
  const key = normalizeName(name);
  if (!key) return undefined;
  const matches = [...users].filter((u) => normalizeName(u.name) === key);
  return matches.length === 1 ? matches[0] : undefined;
}

/** A project from before roles existed that nobody has claimed yet. */
export function isUnclaimed(project: ProjectRecord): boolean {
  return project.legacy === true;
}

export interface Leadership {
  manager_email: string | null;
  lead_email: string | null;
}

/** The copy of a project's leadership that its tasks and team rows carry. */
export function leadershipOf(project: {
  manager_email?: string | null;
  lead_email?: string | null;
}): Leadership {
  return {
    manager_email: normalizeEmail(project.manager_email) || null,
    lead_email: normalizeEmail(project.lead_email) || null,
  };
}

export function sameLeadership(
  row: { manager_email?: string | null; lead_email?: string | null },
  project: { manager_email?: string | null; lead_email?: string | null }
): boolean {
  const a = leadershipOf(row);
  const b = leadershipOf(project);
  return a.manager_email === b.manager_email && a.lead_email === b.lead_email;
}

/**
 * A project's contributor rows. Only rows whose leadership copy matches the
 * project count: the service only lets a manager or lead write a row naming
 * themselves, so a mismatched row was not written by this project's leadership.
 */
export function contributorsOf(
  project: ProjectRecord,
  contributors: readonly ContributorRecord[]
): ContributorRecord[] {
  return contributors.filter(
    (c) => c.project_id === project.id && sameLeadership(c, project)
  );
}

/** The signed-in person's role on a project, or `null` when not on it. */
export function roleOn(
  project: ProjectRecord,
  projectContributors: readonly ContributorRecord[],
  users: UsersById,
  me: string
): ProjectRole | null {
  if (sameEmail(project.manager_email, me)) return 'manager';
  if (sameEmail(project.lead_email, me)) return 'lead';
  if (
    projectContributors.some((c) => sameEmail(users.get(c.user_id)?.email, me))
  ) {
    return 'contributor';
  }
  return null;
}

export function canManage(role: ProjectRole | null): boolean {
  return role === 'manager' || role === 'lead';
}

/** Managers and leads change any task on their project; others only their own. */
export function canEditTask(
  task: TaskRecord,
  role: ProjectRole | null,
  me: string
): boolean {
  return canManage(role) || sameEmail(task.assignee_email, me);
}

export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: ProjectRole;
  /** The contributor row that puts them on the team, for removal. */
  contributor?: ContributorRecord;
}

/** Manager, lead, then contributors by name — each person once, at their highest role. */
export function teamOf(
  project: ProjectRecord,
  projectContributors: readonly ContributorRecord[],
  users: UsersById
): TeamMember[] {
  const team: TeamMember[] = [];
  const add = (
    userId: string | null | undefined,
    copiedEmail: string | null | undefined,
    role: ProjectRole,
    contributor?: ContributorRecord
  ) => {
    if (!userId) return;
    const user = users.get(userId);
    const email = normalizeEmail(user?.email ?? copiedEmail);
    if (team.some((m) => m.userId === userId || (email && m.email === email))) {
      return;
    }
    team.push({
      userId,
      email,
      name: user?.name?.trim() || email || 'Unknown person',
      role,
      contributor,
    });
  };
  add(project.manager_id, project.manager_email, 'manager');
  add(project.lead_id, project.lead_email, 'lead');
  const contributorsByName = [...projectContributors].sort((a, b) =>
    (users.get(a.user_id)?.name ?? '').localeCompare(
      users.get(b.user_id)?.name ?? '',
      undefined,
      { sensitivity: 'base' }
    )
  );
  for (const c of contributorsByName) add(c.user_id, null, 'contributor', c);
  return team;
}
