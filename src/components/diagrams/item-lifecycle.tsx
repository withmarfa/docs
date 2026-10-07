import Link from 'fumadocs-core/link';
import { Archive, Ban, Box, Trash2, type LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Diagram, DiagramWire, type DiagramNode, type DiagramState } from './diagram';
import { operationHref, type Operation } from './item-layers';

/** An item's lifecycle `state`, or `purged` for an item that no longer exists. */
export type StateId = 'archived' | 'active' | 'trashed' | 'purged';

export type LifecycleState = {
  id: StateId;
  label: ReactNode;
  icon: LucideIcon;
  /** A few words, on one line at every width. */
  summary: string;
  /** `false` for `purged`: there is no item left to hold a version. */
  exists: boolean;
};

export type Move = DiagramNode & {
  from: readonly StateId[];
  to: StateId;
  operation: Operation;
};

/**
 * The column, top to bottom. `active` sits between `archived` and `trashed`,
 * so every move but trashing an archived item joins two neighbors.
 */
export const states: readonly LifecycleState[] = [
  {
    id: 'archived',
    label: <code>archived</code>,
    icon: Archive,
    summary: 'Set aside, still readable',
    exists: true,
  },
  { id: 'active', label: <code>active</code>, icon: Box, summary: 'Listed by default', exists: true },
  {
    id: 'trashed',
    label: <code>trashed</code>,
    icon: Trash2,
    summary: 'In the bin, restorable',
    exists: true,
  },
  { id: 'purged', label: 'Purged', icon: Ban, summary: 'Deleted for good', exists: false },
];

const transition: Operation = {
  tag: 'Items',
  operationId: 'transitionItem',
  name: "Change an item's state",
};

function move(data: Omit<Move, 'caption' | 'summary'> & { says: ReactNode }): Move {
  const { says, ...rest } = data;
  return {
    ...rest,
    summary: null,
    caption: (
      <>
        <Link href={operationHref(data.operation)} className="marfa-diagram-caption-link">
          {data.operation.name}
        </Link>{' '}
        {says}
      </>
    ),
  };
}

/**
 * Every move between states. The graph is withmarfa/marfa's `items/transition`,
 * with `items/delete`, `items/restore` and `items/purge`; no move changes the
 * version (`versions/state-keeps-version`).
 */
export const moves: readonly Move[] = [
  move({
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    from: ['active'],
    to: 'archived',
    operation: transition,
    says: (
      <>
        with <code>archived</code> sets the item aside. Listings leave it out unless they name its
        state, and a read by its ID still returns it. The version stays at 3.
      </>
    ),
  }),
  move({
    id: 'unarchive',
    label: 'Unarchive',
    icon: Box,
    from: ['archived'],
    to: 'active',
    operation: transition,
    says: (
      <>
        with <code>active</code> brings an archived item back into listings. The version stays at
        3.
      </>
    ),
  }),
  move({
    id: 'trash',
    label: 'Trash',
    icon: Trash2,
    from: ['active', 'archived'],
    to: 'trashed',
    operation: { tag: 'Items', operationId: 'deleteItem', name: 'Trash an item' },
    says: (
      <>
        moves an active or archived item to the bin, with every item a cascading edge reaches from
        it. A read or write of it is refused until it&apos;s restored. The version stays at 3, and
        the history is kept.
      </>
    ),
  }),
  move({
    id: 'restore',
    label: 'Restore',
    icon: Box,
    from: ['trashed'],
    to: 'active',
    operation: { tag: 'Items', operationId: 'restoreItem', name: 'Restore an item' },
    says: (
      <>
        brings the item back to <code>active</code>, with every item its trash took and nothing
        that was in the bin before. The version is still 3, with the whole history.
      </>
    ),
  }),
  move({
    id: 'purge',
    label: 'Purge',
    icon: Ban,
    from: ['trashed'],
    to: 'purged',
    operation: { tag: 'Items', operationId: 'purgeItem', name: 'Purge an item' },
    says: (
      <>
        deletes the item with its history and edges, and the <code>trash-purge</code> housekeeping
        job does the same once the trash retention passes. A tombstone of its link and natural key
        stays, if it held them.
      </>
    ),
  }),
];

const indexOf = (id: StateId) => states.findIndex((state) => state.id === id);

export type Hop = { move: Move; from: StateId; to: StateId };

/** Each step of each move, from one state to another. */
export const hops: readonly Hop[] = moves.flatMap((m) =>
  m.from.map((from) => ({ move: m, from, to: m.to })),
);

const span = ({ from, to }: Hop) => Math.abs(indexOf(from) - indexOf(to));

/** The hops between neighbors, drawn as arrows in the gap after `states[gap]`. */
const arrowsIn = (gap: number) =>
  hops.filter((hop) => span(hop) === 1 && Math.min(indexOf(hop.from), indexOf(hop.to)) === gap);

/** The hops that skip a state, drawn down a rail on the left. */
export const railHops: readonly Hop[] = hops.filter((hop) => span(hop) > 1);
const rail = railHops[0];

/** Which piece of the rail a row of the column carries, if any. */
function railPart(row: number): 'out' | 'through' | 'in' | null {
  if (!rail) return null;
  const top = indexOf(rail.from) * 2;
  const bottom = indexOf(rail.to) * 2;
  if (row === top) return 'out';
  if (row === bottom) return 'in';
  return row > top && row < bottom ? 'through' : null;
}

/**
 * The life of one item: its states in a column, each move an arrow in the
 * gap between the two states it joins, and trashing an archived item, the
 * one move that skips a state, on a rail down the left. Selecting a move
 * lights its arrow and the states it joins, and says which operation makes
 * it and what the item keeps. Every state the item exists in shows the same
 * version, because no move changes it.
 */
export function ItemLifecycle() {
  return (
    <Diagram
      label="How an item leaves and comes back"
      nodes={moves}
      idleCaption="Select a move to see which operation makes it and what the item keeps. No move changes the version."
    >
      {({ selected, stateOf, toggle }) => {
        const current = moves.find((m) => m.id === selected);
        const joins = (id: StateId) => current?.to === id || current?.from.includes(id) === true;
        const stateLit = (id: StateId): DiagramState =>
          current === undefined ? 'idle' : joins(id) ? 'on' : 'off';
        const railState: DiagramState = rail ? stateOf(rail.move.id) : 'idle';

        return (
          <div className="marfa-lc">
            {states.map((state, index) => {
              const Icon = state.icon;
              const statePart = railPart(index * 2);
              const gapPart = railPart(index * 2 + 1);
              const arrows = arrowsIn(index);
              return (
                <Fragment key={state.id}>
                  <div className="marfa-lc-row">
                    {statePart ? (
                      <DiagramWire
                        className={`marfa-lc-rail marfa-lc-rail-${statePart}`}
                        state={railState}
                      />
                    ) : null}
                    <div
                      className="marfa-diagram-box marfa-lc-state"
                      data-state={stateLit(state.id)}
                      data-exists={state.exists}
                    >
                      <div className="marfa-diagram-box-title">
                        <Icon aria-hidden="true" />
                        <span>{state.label}</span>
                        {state.exists ? <span className="marfa-lc-version">version 3</span> : null}
                      </div>
                      <div className="marfa-diagram-box-summary">{state.summary}</div>
                    </div>
                  </div>
                  {arrows.length > 0 || gapPart ? (
                    <div className="marfa-lc-gap">
                      {gapPart ? (
                        <DiagramWire
                          className={`marfa-lc-rail marfa-lc-rail-${gapPart}`}
                          state={railState}
                        />
                      ) : null}
                      {arrows.map(({ move: m, from, to }) => (
                        <span
                          key={`${m.id}-${from}`}
                          className="marfa-lc-move"
                          data-state={stateOf(m.id)}
                          onClick={() => toggle(m.id)}
                        >
                          <DiagramWire
                            className={`marfa-lc-shaft ${indexOf(to) > indexOf(from) ? 'marfa-lc-down' : 'marfa-lc-up'}`}
                            state={stateOf(m.id)}
                          />
                          <span className="marfa-lc-move-label">{m.label}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        );
      }}
    </Diagram>
  );
}
