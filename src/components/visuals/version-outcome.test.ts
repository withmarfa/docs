import { describe, expect, it } from 'vitest';
import { answer, cases, initial, messages, otherChanged, outcome } from './version-outcome';

describe('version outcome figure', () => {
  it('starts with the other app changing the title, as the sequence above it does', () => {
    expect(initial).toBe('different');
    expect(otherChanged(initial)).toBe('title');
  });

  // withmarfa/marfa: `versions/merge-stale` (a stale write that collides on
  // nothing is applied over the current item), `versions/stale-collision`
  // (`409 version_conflict`), `versions/auto-keep-both` and
  // `versions/copy-written` (`conflict=auto` on a `keep_both_copies` property).
  it('gives each case its own outcome', () => {
    expect(outcome('different')).toBe('merged');
    expect(outcome('same')).toBe('conflict');
    expect(outcome('auto')).toBe('copy');
  });

  // `versions/merge-version`: a merged or resolved write is the version after the
  // one the item held; a refused write changes nothing (`versions/refused-keeps-history`).
  it('moves the note to version 5 unless the write is refused, and names the refusal', () => {
    expect(answer('different')).toMatchObject({ status: '200', version: 5 });
    expect(answer('same')).toMatchObject({ status: '409 version_conflict', version: 4 });
    expect(answer('auto')).toMatchObject({ status: '200', version: 5 });
  });

  // `versions/collision-omitted`: a field the write does not carry never collides.
  it('says which writer holds each field after', () => {
    expect(answer('different')).toMatchObject({ title: "The other app's", body: 'Yours' });
    expect(answer('auto')).toMatchObject({ title: 'Unchanged', body: "The other app's" });
  });

  it('has a message for every outcome and one button for each', () => {
    expect(Object.keys(messages).sort()).toEqual(['conflict', 'copy', 'merged']);
    expect(cases.map((c) => outcome(c.id)).sort()).toEqual(['conflict', 'copy', 'merged']);
  });
});
