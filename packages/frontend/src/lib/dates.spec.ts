import { describe, expect, it } from 'vitest';

import {
  addDaysYmd,
  describeDue,
  dueState,
  localTodayYmd,
  toDate,
  toYmd,
  ymdToDate,
} from './dates';

describe('due dates', () => {
  it('reads Date objects and ISO strings from the service as the same day', () => {
    expect(toYmd(new Date('2026-11-03T00:00:00Z'))).toBe('2026-11-03');
    expect(toYmd('2026-11-03T00:00:00.000Z')).toBe('2026-11-03');
    expect(toYmd('2026-11-03T00:00:00')).toBe('2026-11-03');
    expect(toYmd('2026-11-03')).toBe('2026-11-03');
  });

  it('treats missing and malformed values as no date', () => {
    expect(toYmd(null)).toBeNull();
    expect(toYmd(undefined)).toBeNull();
    expect(toYmd('')).toBeNull();
    expect(toYmd('not a date')).toBeNull();
    expect(toDate({})).toBeNull();
  });

  it('round-trips a picked day through storage', () => {
    expect(toYmd(ymdToDate('2026-02-28'))).toBe('2026-02-28');
    expect(ymdToDate('28/02/2026')).toBeNull();
  });

  it('uses the local calendar day for today', () => {
    expect(localTodayYmd(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('adds days across month ends', () => {
    expect(addDaysYmd('2026-01-30', 3)).toBe('2026-02-02');
  });

  it('classifies due dates against today', () => {
    const today = '2026-10-25';
    expect(dueState(null, today)).toBe('none');
    expect(dueState('2026-10-24', today)).toBe('overdue');
    expect(dueState('2026-10-25', today)).toBe('today');
    expect(dueState('2026-11-01', today)).toBe('soon');
    expect(dueState('2026-11-02', today)).toBe('later');
  });

  it('describes due dates in plain words', () => {
    const today = '2026-10-25';
    expect(describeDue('2026-10-25', today)).toBe('Due today');
    expect(describeDue('2026-10-26', today)).toBe('Due tomorrow');
    expect(describeDue('2026-10-22', today)).toBe('3 days overdue');
    expect(describeDue(undefined, today)).toBe('No due date');
  });
});
