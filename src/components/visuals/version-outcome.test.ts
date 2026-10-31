import { describe, expect, it } from 'vitest';
import { answer, cases, outcome } from './version-outcome';

describe('version outcome figure', () => {
  // withmarfa/marfa: `versions/merge-stale` (a stale write that collides on
  // nothing is applied over the current item), `versions/stale-collision`
  // (`409 version_conflict`), `versions/auto-keep-both` and
  // `versions/copy-written` (`conflict=auto` on a `keep_both_copies` property).
  it('gives each case its own outcome', () => {
    expect(outcome('title')).toBe('merged');
    expect(outcome('body')).toBe('conflict');
    expect(outcome('auto')).toBe('copy');
  });

  // `versions/merge-version`: a merged or resolved write is the version after the
  // one the item held; a refused write changes nothing (`versions/refused-keeps-history`).
  it('moves the note to version 5 unless the write is refused, and names the refusal', () => {
    expect(answer('title')).toMatchObject({ status: '200', version: 5 });
    expect(answer('body')).toMatchObject({ status: '409 version_conflict', version: 4 });
    expect(answer('auto')).toMatchObject({ status: '200', version: 5 });
  });

  // `versions/collision-omitted`: a field the write does not carry never collides.
  // `versions/auto-keep-both`: the note keeps the body it holds, and yours goes into the copy.
  it('says which writer holds each field after', () => {
    expect(answer('title')).toMatchObject({ title: "The other app's", body: 'Yours', copy: 'None' });
    expect(answer('body')).toMatchObject({ title: 'Unchanged', body: "The other app's", copy: 'None' });
    expect(answer('auto')).toMatchObject({ title: 'Unchanged', body: "The other app's", copy: 'Yours' });
  });

  it('draws one case for each outcome', () => {
    expect(cases.map((c) => outcome(c.id)).sort()).toEqual(['conflict', 'copy', 'merged']);
  });
});
