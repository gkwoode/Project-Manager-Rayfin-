//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import {
  authenticated,
  boolean,
  date,
  entity,
  one,
  set,
  text,
  uuid,
} from '@microsoft/rayfin-core';
import type { TaskPriority, TaskStatus } from '@rayfin-app/shared';

import { Project } from './Project.js';

/**
 * A unit of work on a project board.
 *
 * Every signed-in member of staff can read tasks, so a project's whole team
 * sees its board — a policy cannot limit reading to a project's members. Only
 * the task's assignee and the project's manager and lead can create, change,
 * or delete it. The assignee is an `AppUser` id; their email and the project
 * leadership's emails are copied onto the row for the policy to compare.
 *
 * Tasks from the app's first version are marked by `legacy` (added with a
 * default of `true`) and stay updatable by any signed-in user until their
 * project is claimed, which is how they gain an owner. `assignee` is the
 * first version's free-text assignee name, kept so no data is lost.
 */
@entity()
@authenticated('read')
@authenticated('create', {
  policy: (claims, item) =>
    claims.email
      .eq(item.assignee_email)
      .or(claims.email.eq(item.manager_email))
      .or(claims.email.eq(item.lead_email))
      .and(item.legacy.eq(false)),
})
@authenticated('update', {
  policy: (claims, item) =>
    claims.email
      .eq(item.assignee_email)
      .or(claims.email.eq(item.manager_email))
      .or(claims.email.eq(item.lead_email))
      .or(item.legacy.eq(true)),
})
@authenticated('delete', {
  policy: (claims, item) =>
    claims.email
      .eq(item.assignee_email)
      .or(claims.email.eq(item.manager_email))
      .or(claims.email.eq(item.lead_email)),
})
export class Task {
  @uuid() id!: string;
  @text({ min: 1, max: 200 }) title!: string;
  @text({ optional: true, max: 2000 }) notes?: string;
  @set('todo', 'in-progress', 'review', 'done') status!: TaskStatus;
  @set('low', 'medium', 'high', 'urgent') priority!: TaskPriority;
  @text({ optional: true, max: 120 }) assignee?: string;
  @boolean({ default: true }) legacy!: boolean;
  @uuid({ optional: true }) assignee_id?: string;
  @text({ optional: true, max: 254 }) assignee_email?: string;
  @text({ optional: true, max: 254 }) manager_email?: string;
  @text({ optional: true, max: 254 }) lead_email?: string;
  @date({ optional: true }) dueDate?: Date;
  @date() createdAt!: Date;
  @uuid() project_id!: string;
  @one(() => Project) project?: Project;
}
