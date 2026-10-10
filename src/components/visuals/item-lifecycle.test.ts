import { describe, expect, it } from 'vitest';
import spec from '../../../openapi.json';
import { moves, movesIn, skips, states } from './item-lifecycle';

const itemStates = (spec as unknown as { components: { schemas: { ItemState: { enum: string[] } } } })
  .components.schemas.ItemState.enum;

describe('item lifecycle figure', () => {
  // `purged` is not a state: a purged item no longer exists. `revoked` is the
  // lifecycle of `system.*` items only (`items/system-lifecycle`).
  it('draws the states an ItemState names, and purged, which it does not', () => {
    for (const state of states) {
      if (state.exists) expect(itemStates, state.id).toContain(state.id);
      else expect(itemStates, state.id).not.toContain(state.id);
    }
    expect(itemStates.filter((s) => s !== 'revoked').sort()).toEqual(
      states.filter((s) => s.exists).map((s) => s.id).sort(),
    );
  });

  // withmarfa/marfa: `items/transition`, `items/delete`, `items/restore`, and
  // `items/purge` with `items/purge-live` (only a trashed item is purged).
  it('draws exactly the moves the contract allows', () => {
    expect(moves.map(({ name, from, to }) => `${from} > ${to} (${name})`).sort()).toEqual(
      [
        'active > archived (archive)',
        'archived > active (unarchive)',
        'active > trashed (trash)',
        'archived > trashed (trash)',
        'trashed > active (restore)',
        'trashed > purged (purge)',
      ].sort(),
    );
  });

  it('places every move once: between neighbors, or over the row when it skips a state', () => {
    const placed = [...states.keys()].flatMap((gap) => movesIn(gap));
    expect(placed.length + skips.length).toBe(moves.length);
    expect(skips).toHaveLength(1);
  });
});
