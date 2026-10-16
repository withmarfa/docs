import { describe, expect, it } from 'vitest';
import { answers, initial, itemTypes, keys, messages, reasonFor } from './key-reach';

const key = (id: string) => keys.find((candidate) => candidate.id === id)!;

describe('key reach figure', () => {
  it('starts on a key that reads and writes the note', () => {
    expect(reasonFor(key(initial.key), initial.type)).toBe('write');
  });

  // withmarfa/marfa: `keys-and-oauth/permissions-no-content` (permissions and no
  // type map: 403), `keys-and-oauth/unreadable-as-missing` (a type the key may not
  // read answers as a missing item: 404) and `keys-and-oauth/readable-not-writable`
  // (a type it may read and not write: 403 on a write).
  it('refuses every item to a key with permissions and no type map, 403', () => {
    for (const type of itemTypes) {
      expect(answers(reasonFor(key('audit'), type))).toEqual({
        read: { status: 403, code: 'type_not_permitted' },
        change: { status: 403, code: 'type_not_permitted' },
      });
    }
  });

  it('answers a type outside the key’s map as an item that does not exist, for a read and a write', () => {
    expect(answers(reasonFor(key('notes'), 'core.task'))).toEqual({
      read: { status: 404, code: 'item_not_found' },
      change: { status: 404, code: 'item_not_found' },
    });
  });

  it('lets a read-only grant read and refuses it a change with 403', () => {
    expect(answers(reasonFor(key('tasks'), 'core.task'))).toEqual({
      read: { status: 200 },
      change: { status: 403, code: 'type_not_permitted' },
    });
  });

  it('lets a write grant read and change', () => {
    expect(answers(reasonFor(key('both'), 'core.note'))).toEqual({ read: { status: 200 }, change: { status: 200 } });
  });

  it('never answers a read with 403 to a key that has a type map', () => {
    for (const candidate of keys.filter((k) => k.types)) {
      for (const type of itemTypes) {
        expect(answers(reasonFor(candidate, type)).read.status).not.toBe(403);
      }
    }
  });

  it('has a message for every reason', () => {
    expect(Object.keys(messages).sort()).toEqual(['no-map', 'out-of-reach', 'read-only', 'write']);
  });
});
