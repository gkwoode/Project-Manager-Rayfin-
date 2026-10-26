import { MissingRayfinConfigError } from './rayfin-client';

/**
 * A short, actionable message for a failed service call.
 *
 * Raw GraphQL and provider errors can carry internals, so they go to the
 * console for troubleshooting and the person sees a sentence they can act on.
 */
export function describeError(error: unknown): string {
  if (error instanceof MissingRayfinConfigError) {
    return "This app isn't connected to its Fabric backend yet. Restart the dev server or redeploy, then reload.";
  }

  const text = error instanceof Error ? error.message : String(error ?? '');

  if (/\b(401|unauthori[sz]ed|not signed in|token)\b/iu.test(text)) {
    return 'Your session has expired. Reload the page to sign in again.';
  }
  if (/\b(403|forbidden|permission|not authori[sz]ed)\b/iu.test(text)) {
    return "You don't have permission to do that in this workspace.";
  }
  if (/failed to fetch|network|timed? ?out|ECONN|503|502|504/iu.test(text)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (/foreign key|REFERENCE constraint/iu.test(text)) {
    return 'That record is still linked to other records, so it was not changed.';
  }
  return 'Something went wrong while saving or loading. Please try again.';
}
