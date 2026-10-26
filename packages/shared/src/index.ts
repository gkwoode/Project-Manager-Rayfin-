/**
 * Browser-safe contracts shared by the data registration package and frontend.
 *
 * Keep each record shape aligned with its decorated runtime entity in
 * `@rayfin-app/data`. This package must stay isomorphic, so do not import the
 * decorated classes here.
 */
export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** What someone can do on a project. Managers and leads have equal rights. */
export type ProjectRole = 'manager' | 'lead' | 'contributor';

/**
 * A person in the directory. Emails are stored lower-cased and never change,
 * because access to projects and tasks follows them.
 */
export interface UserRecord {
  id: string;
  name: string;
  email: string;
}

/**
 * Optional fields are `| null` because the service returns `null` for a
 * cleared value, and an update has to be able to send one to clear it.
 *
 * People are referenced by `AppUser` id. Their emails are copied into the
 * `*_email` fields because access policies compare the signed-in user's
 * email claim with fields on the row itself.
 */
export interface ProjectRecord {
  id: string;
  name: string;
  client?: string | null;
  description?: string | null;
  status: ProjectStatus;
  archived: boolean;
  /** True for projects from before roles existed, until someone claims them. */
  legacy: boolean;
  /** The first version's free-text lead name, kept so no data is lost. */
  lead?: string | null;
  dueDate?: Date | null;
  manager_id?: string | null;
  manager_email?: string | null;
  lead_id?: string | null;
  lead_email?: string | null;
  createdAt: Date;
}

/** Puts a user on one project's team, with a copy of its leadership's emails. */
export interface ContributorRecord {
  id: string;
  project_id: string;
  user_id: string;
  manager_email?: string | null;
  lead_email?: string | null;
  createdAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  notes?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** True for tasks from before roles existed, until their project is claimed. */
  legacy: boolean;
  /** The first version's free-text assignee name, kept until linked to a person. */
  assignee?: string | null;
  assignee_id?: string | null;
  assignee_email?: string | null;
  manager_email?: string | null;
  lead_email?: string | null;
  dueDate?: Date | null;
  createdAt: Date;
  project_id: string;
}

export type UniversalAppSchema = {
  AppUser: UserRecord;
  Project: ProjectRecord;
  ProjectContributor: ContributorRecord;
  Task: TaskRecord;
};
