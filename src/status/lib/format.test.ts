import { describe, expect, it } from 'vitest';
import { formatAbsolute, formatAge, formatDuration, formatUptime } from './format';

describe('formatting that has to match between server and client', () => {
  it('formats an absolute time in UTC, regardless of the running locale', () => {
    expect(formatAbsolute(1788651670)).toBe('5 September 2026, 23:41 UTC');
  });

  it.each([
    [0, 'just now'],
    [59, 'just now'],
    [60, '1 minute ago'],
    [3599, '59 minutes ago'],
    [3600, '1 hour ago'],
    [86_399, '23 hours ago'],
    [86_400, '1 day ago'],
  ])('describes an age of %i seconds as "%s"', (age, expected) => {
    expect(formatAge(1_000_000 - age, 1_000_000)).toBe(expected);
  });

  it('never reports a negative age, so a clock skew reads as fresh', () => {
    expect(formatAge(1_000_100, 1_000_000)).toBe('just now');
  });

  it.each([
    [48, '48 seconds'],
    [60, '1 minute'],
    [360, '6 minutes'],
    [7200, '2 hours'],
    [7500, '2 hours 5 minutes'],
  ])('describes a duration of %i seconds as "%s"', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  // Rounding an outage away contradicts the incident list printed under it.
  it('does not round a real outage up to a clean hundred percent', () => {
    expect(formatUptime(1)).toBe('100.00%');
    expect(formatUptime(1 - 60 / (90 * 24 * 60 * 60))).toBe('99.99%');
    expect(formatUptime(0.9994)).toBe('99.94%');
  });
});
