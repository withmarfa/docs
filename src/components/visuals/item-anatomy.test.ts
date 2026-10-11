import { describe, expect, it } from 'vitest';
import { apply, initial, result, writes, type AnatomyState } from './item-anatomy';

const run = (...ids: AnatomyState['last'][]) =>
  ids.reduce<AnatomyState>((state, id) => (id ? apply(state, id) : state), initial);

describe('item anatomy', () => {
  it('starts the note at version 3 with two edges', () => {
    expect(initial).toEqual({ version: 3, edgeAdded: false, last: null });
  });

  // withmarfa/marfa: `versions/update-step` moves the item on a property write;
  // `versions/metadata-keeps-version` keeps it on a tag or extension write; an
  // edge has its own version from 1 (`edges/create-version`).
  it('moves the version on each property write and on nothing else', () => {
    expect(run('property').version).toBe(4);
    expect(run('property', 'property').version).toBe(5);
    expect(run('tag', 'extension', 'edge').version).toBe(3);
    expect(run('property', 'tag', 'property').version).toBe(5);
  });

  it('adds the edge once and keeps it until reset', () => {
    expect(run('edge').edgeAdded).toBe(true);
    expect(run('edge', 'tag', 'property').edgeAdded).toBe(true);
    expect(run('tag').edgeAdded).toBe(false);
  });

  it('lights the write pressed last', () => {
    expect(run('tag', 'extension').last).toBe('extension');
  });

  it('says what each write did, with the version the note is at', () => {
    expect(result('property', 4)).toBe('The note moves to version 4.');
    expect(result('tag', 3)).toBe('Tag added. The note stays at version 3.');
    expect(result('edge', 5)).toContain('version 1');
    for (const { id } of writes) expect(result(id, 3)).toMatch(/version 3\.$/);
  });
});
