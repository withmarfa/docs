import { describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import spec from '../../../openapi.json';
import { operationHref } from './item-layers';
import { hops, moves, railHops, states } from './item-lifecycle';

type Operation = { operationId?: string; tags?: string[]; summary?: string };

function operations(): Map<string, Operation> {
  const out = new Map<string, Operation>();
  const paths = (spec as unknown as { paths: Record<string, Record<string, Operation>> }).paths;
  for (const item of Object.values(paths)) {
    for (const operation of Object.values(item)) {
      if (operation?.operationId) out.set(operation.operationId, operation);
    }
  }
  return out;
}

const itemStates = (spec as unknown as { components: { schemas: { ItemState: { enum: string[] } } } })
  .components.schemas.ItemState.enum;

describe('item lifecycle', () => {
  it('names each move and each state once', () => {
    expect(new Set(moves.map((m) => m.id)).size).toBe(moves.length);
    expect(new Set(states.map((s) => s.id)).size).toBe(states.length);
  });

  it('makes each move with an operation the API description holds, under its tag and name', () => {
    const byId = operations();
    for (const { id, operation } of moves) {
      const found = byId.get(operation.operationId);
      expect(found, id).toBeDefined();
      expect(found?.tags, id).toContain(operation.tag);
      expect(found?.summary, id).toBe(operation.name);
    }
  });

  it('links each operation to a page that exists', () => {
    const urls = new Set(source.getPages().map((page) => page.url));
    expect(moves.map((m) => operationHref(m.operation)).filter((href) => !urls.has(href))).toEqual([]);
  });

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

  // withmarfa/marfa's items chapter: `items/transition` for the graph, then
  // `items/delete`, `items/restore` and `items/purge`.
  it('draws each move the contract allows between states, by the operation that makes it', () => {
    const drawn = hops.map(({ move, from, to }) => `${from} > ${to} by ${move.operation.operationId}`).sort();
    expect(drawn).toEqual(
      [
        'active > archived by transitionItem',
        'archived > active by transitionItem',
        'active > trashed by deleteItem',
        'archived > trashed by deleteItem',
        'trashed > active by restoreItem',
        'trashed > purged by purgeItem',
      ].sort(),
    );
  });

  it('draws one move that skips a state, downward, on the rail', () => {
    const order = states.map((s) => s.id);
    expect(railHops).toHaveLength(1);
    const [hop] = railHops;
    expect(order.indexOf(hop.to)).toBeGreaterThan(order.indexOf(hop.from));
  });
});
