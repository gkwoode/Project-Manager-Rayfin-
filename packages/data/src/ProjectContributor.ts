//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import {
  authenticated,
  date,
  entity,
  one,
  text,
  uuid,
} from '@microsoft/rayfin-core';

import { AppUser } from './AppUser.js';
import { Project } from './Project.js';

/**
 * Puts an `AppUser` on a project's team as a contributor.
 *
 * Team lists are readable by every signed-in member of staff, like the
 * project directory. Only the project's manager or lead can add or remove
 * contributors. A policy can only see the row it guards, so the row carries
 * copies of the project's `manager_email` and `lead_email`; the app rewrites
 * them whenever the project's leadership changes.
 */
@entity()
@authenticated('read')
@authenticated(['create', 'update', 'delete'], {
  policy: (claims, item) =>
    claims.email.eq(item.manager_email).or(claims.email.eq(item.lead_email)),
})
export class ProjectContributor {
  @uuid() id!: string;
  @uuid() project_id!: string;
  @one(() => Project) project?: Project;
  @uuid() user_id!: string;
  @one(() => AppUser) user?: AppUser;
  @text({ optional: true, max: 254 }) manager_email?: string;
  @text({ optional: true, max: 254 }) lead_email?: string;
  @date() createdAt!: Date;
}
