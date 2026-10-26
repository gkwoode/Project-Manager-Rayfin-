/**
 * Date-only handling for due dates.
 *
 * A due date is a calendar day, not an instant. It is stored as UTC midnight
 * and read back in UTC, so `2026-11-03` never renders as the 2nd west of UTC.
 * "Today" is the viewer's own calendar day.
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/u;
const DAY_MS = 86_400_000;

/** Normalises a service value (a `Date` or an ISO string) to a `Date`. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || value.trim() === '') return null;

  const text = value.trim();
  // A bare date or a datetime without an offset is a UTC value from the store.
  const iso = YMD.test(text)
    ? `${text}T00:00:00Z`
    : /[zZ]|[+-]\d{2}:?\d{2}$/u.test(text)
      ? text
      : `${text}Z`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The UTC calendar day of a stored due date, as `YYYY-MM-DD`. */
export function toYmd(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

/** The value to store for a calendar day picked in a date input. */
export function ymdToDate(ymd: string): Date | null {
  return YMD.test(ymd) ? new Date(`${ymd}T00:00:00Z`) : null;
}

/** The viewer's local calendar day, as `YYYY-MM-DD`. */
export function localTodayYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const base = ymdToDate(ymd);
  if (!base) return ymd;
  return new Date(base.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = ymdToDate(from);
  const b = ymdToDate(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

const shortFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const mediumFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

export function formatDueDate(
  value: unknown,
  style: 'short' | 'medium' = 'medium'
): string {
  const ymd = toYmd(value);
  if (!ymd) return 'No date';
  const date = ymdToDate(ymd)!;
  return (style === 'short' ? shortFormatter : mediumFormatter).format(date);
}

export type DueState = 'none' | 'overdue' | 'today' | 'soon' | 'later';

/** Where a due date sits relative to today; `soon` is within `soonDays`. */
export function dueState(
  value: unknown,
  today: string,
  soonDays = 7
): DueState {
  const ymd = toYmd(value);
  if (!ymd) return 'none';
  const diff = daysBetween(today, ymd);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= soonDays) return 'soon';
  return 'later';
}

/** A short human phrase such as "Due today", "3 days overdue", "Due in 2 days". */
export function describeDue(value: unknown, today: string): string {
  const ymd = toYmd(value);
  if (!ymd) return 'No due date';
  const diff = daysBetween(today, ymd);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return '1 day overdue';
  if (diff < 0) return `${-diff} days overdue`;
  return `Due in ${diff} days`;
}
