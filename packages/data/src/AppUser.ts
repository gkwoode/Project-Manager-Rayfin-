//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { authenticated, entity, text, uuid } from '@microsoft/rayfin-core';

/**
 * A person who can manage, lead, or contribute to projects.
 *
 * Named `AppUser` because `User` is Rayfin's built-in sign-in identity.
 *
 * Every signed-in member of staff can read the directory and add people to
 * it, so a manager can add a colleague who has not signed in yet. Rows are
 * never deleted, because projects and tasks point at them. People can rename
 * only themselves, and an email never changes once added — access to
 * projects and tasks follows the email.
 */
@entity()
@authenticated(['create', 'read'])
@authenticated('update', {
  policy: (claims, item) => claims.email.eq(item.email),
  exclude: ['email'],
})
export class AppUser {
  @uuid() id!: string;
  @text({ min: 1, max: 120 }) name!: string;
  @text({ min: 3, max: 254, unique: true }) email!: string;
}
