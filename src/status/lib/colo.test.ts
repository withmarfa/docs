import { describe, expect, it } from 'vitest';
import { resolveLocation } from './colo';

describe('resolveLocation', () => {
  it('names a mapped edge', () => {
    expect(resolveLocation('CDG')).toBe('Paris');
    expect(resolveLocation('LHR')).toBe('London');
  });

  it('falls back to the code rather than to nothing', () => {
    expect(resolveLocation('ZZZ')).toBe('ZZZ');
  });

  it('refuses the checker own failure value', () => {
    // "measured from ERROR" reads as a failure of the thing being measured.
    expect(resolveLocation('ERROR')).toBeNull();
  });

  it('handles an absent or blank location', () => {
    expect(resolveLocation(null)).toBeNull();
    expect(resolveLocation('')).toBeNull();
    expect(resolveLocation('   ')).toBeNull();
  });

  it('normalizes casing and whitespace', () => {
    expect(resolveLocation(' cdg ')).toBe('Paris');
  });
});
