/**
 * Turns a sign-in email into a display name, e.g. `ada.obi@contoso.com` ->
 * `Ada Obi`. The session exposes only an id and an email, so this is the best
 * name available for "Assign to me" and the greeting.
 */
export function nameFromEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  const local = email.split('@')[0] ?? '';
  return local
    .split(/[._-]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Up to two initials for an avatar, e.g. `Ada Obi` -> `AO`. */
export function initials(name: unknown): string {
  if (typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

/** Distinct non-empty names, case-insensitively, in alphabetical order. */
export function uniqueNames(values: readonly unknown[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const name = value.trim();
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

/** Morning, afternoon or evening for the viewer's local time. */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
