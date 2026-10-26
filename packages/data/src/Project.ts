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
  many,
  set,
  text,
  uuid,
} from '@microsoft/rayfin-core';
import type { ProjectStatus } from '@rayfin-app/shared';

import { ProjectContributor } from './ProjectContributor.js';
import { Task } from './Task.js';

/**
 * A client engagement or internal initiative that groups tasks.
 *
 * Every signed-in member of staff can read the project directory. Only the
 * project's manager or lead can change, archive, or delete a project, and you
 * can only create a project you manage or lead.
 *
 * The manager and lead are `AppUser` ids. A policy can only see the row it
 * guards, so their emails are copied into `manager_email` and `lead_email`
 * for the policy to compare with the caller's email claim.
 *
 * Projects from the app's first version predate roles. `legacy` is added with
 * a default of `true`, which marks those rows; until someone claims one by
 * becoming its manager or lead, any signed-in user may update it. New
 * projects must be created with `legacy: false`. `lead` is the first
 * version's free-text lead name, kept so no data is lost — which is also why
 * the manager and lead are plain ids rather than `@one` relationships, as a
 * relationship named `lead` would collide with it.
 *
 * Every `@text` carries an explicit `max`. Without one MSSQL gets
 * `NVARCHAR(MAX)`, and the metadata provider can then fail to build a GraphQL
 * schema after a deploy that reported success.
 */
@entity()
@authenticated('read')
@authenticated('create', {
  policy: (claims, item) =>
    claims.email
      .eq(item.manager_email)
      .or(claims.email.eq(item.lead_email))
      .and(item.legacy.eq(false)),
})
@authenticated('update', {
  policy: (claims, item) =>
    claims.email
      .eq(item.manager_email)
      .or(claims.email.eq(item.lead_email))
      .or(item.legacy.eq(true)),
})
@authenticated('delete', {
  policy: (claims, item) =>
    claims.email.eq(item.manager_email).or(claims.email.eq(item.lead_email)),
})
export class Project {
  @uuid() id!: string;
  @text({ min: 1, max: 120 }) name!: string;
  @text({ optional: true, max: 120 }) client?: string;
  @text({ optional: true, max: 2000 }) description?: string;
  @text({ optional: true, max: 120 }) lead?: string;
  @set('planning', 'active', 'on-hold', 'completed') status!: ProjectStatus;
  @boolean({ default: false }) archived!: boolean;
  @boolean({ default: true }) legacy!: boolean;
  @date({ optional: true }) dueDate?: Date;
  @uuid({ optional: true }) manager_id?: string;
  @text({ optional: true, max: 254 }) manager_email?: string;
  @uuid({ optional: true }) lead_id?: string;
  @text({ optional: true, max: 254 }) lead_email?: string;
  @date() createdAt!: Date;
  @many(() => Task) tasks?: Task[];
  @many(() => ProjectContributor) contributors?: ProjectContributor[];
}
