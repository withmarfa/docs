import { describe, expect, it } from 'vitest';
import { answer, changes, initial, messages, modes, outcome, type Change, type Mode } from './version-outcome';

const run = (change: Change, mode: Mode) => outcome({ change, mode });

describe('version outcome figure', () => {
  it('starts with the title changed and a plain write, as the sequence above it does', () => {
    expect(initial).toEqual({ change: 'title', mode: 'plain' });
  });

  // withmarfa/marfa: `versions/merge-stale` (a stale write that collides on
  // nothing is applied over the current item), `versions/stale-collision`
  // (`409 version_conflict`), `versions/auto-keep-both` and
  // `versions/copy-written` (`conflict=auto` on a `keep_both_copies` property).
  it('lets both changes stand when the other app left the body alone, however the write is sent', () => {
    expect(run('title', 'plain')).toBe('merged');
    expect(run('title', 'auto')).toBe('merged');
  });

  it('refuses a plain write when the other app changed the body, and writes a copy for conflict=auto', () => {
    for (const change of ['body', 'both'] as const) {
      expect(run(change, 'plain')).toBe('conflict');
      expect(run(change, 'auto')).toBe('copy');
    }
  });

  // `versions/merge-version`: a merged or resolved write is the version after the
  // one the item held; a refused write changes nothing (`versions/refused-keeps-history`).
  it('moves the note to version 5 unless the write is refused, and names the refusal', () => {
    expect(answer({ change: 'title', mode: 'plain' })).toMatchObject({ status: '200', version: 5 });
    expect(answer({ change: 'body', mode: 'plain' })).toMatchObject({ status: '409 version_conflict', version: 4 });
    expect(answer({ change: 'both', mode: 'auto' })).toMatchObject({ status: '200', version: 5 });
  });

  // `versions/collision-omitted`: a field the write does not carry never collides.
  it('says which writer holds each field after', () => {
    expect(answer({ change: 'title', mode: 'plain' })).toMatchObject({ title: "The other app's", body: 'Yours' });
    expect(answer({ change: 'body', mode: 'auto' })).toMatchObject({ title: 'Unchanged', body: "The other app's" });
    expect(answer({ change: 'both', mode: 'auto' })).toMatchObject({ title: "The other app's", body: "The other app's" });
  });

  it('has a message for every outcome and a button for every choice', () => {
    expect(Object.keys(messages).sort()).toEqual(['conflict', 'copy', 'merged']);
    expect(changes.map((c) => c.id)).toEqual(['title', 'body', 'both']);
    expect(modes.map((m) => m.id)).toEqual(['plain', 'auto']);
  });
});
