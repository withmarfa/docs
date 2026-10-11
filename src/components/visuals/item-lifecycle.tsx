import { Archive, Ban, Box as BoxIcon, Trash2, type LucideIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Arrow, ArrowHead, Box, Figure, Flow } from './figure';

/** An item's lifecycle `state`, or `purged` for an item that no longer exists. */
export type StateId = 'archived' | 'active' | 'trashed' | 'purged';

export type State = { id: StateId; icon: LucideIcon; exists: boolean };

/** Left to right (top to bottom once narrow): `active` sits between the two states it leaves for. */
export const states: readonly State[] = [
  { id: 'archived', icon: Archive, exists: true },
  { id: 'active', icon: BoxIcon, exists: true },
  { id: 'trashed', icon: Trash2, exists: true },
  { id: 'purged', icon: Ban, exists: false },
];

export type Move = { name: string; from: StateId; to: StateId };

/**
 * Every move between states, after withmarfa/marfa's `items/transition`,
 * `items/delete`, `items/restore` and `items/purge`. Trashing an archived item
 * is the one move that skips a state, so it is drawn over the others.
 */
export const moves: readonly Move[] = [
  { name: 'archive', from: 'active', to: 'archived' },
  { name: 'unarchive', from: 'archived', to: 'active' },
  { name: 'trash', from: 'active', to: 'trashed' },
  { name: 'restore', from: 'trashed', to: 'active' },
  { name: 'purge', from: 'trashed', to: 'purged' },
  { name: 'trash', from: 'archived', to: 'trashed' },
];

const indexOf = (id: StateId) => states.findIndex((state) => state.id === id);

/** The moves between neighbors, in the gap after `states[gap]`. */
export const movesIn = (gap: number) =>
  moves.filter((move) => Math.abs(indexOf(move.from) - indexOf(move.to)) === 1 && Math.min(indexOf(move.from), indexOf(move.to)) === gap);

/** The one move that skips a state. */
export const skips = moves.filter((move) => Math.abs(indexOf(move.from) - indexOf(move.to)) > 1);

/**
 * The life of an item as a state diagram: three states and the end, with an
 * arrow for each move. Static: the shape is the point.
 */
export function ItemLifecycle({ caption }: { caption?: ReactNode }) {
  const [skip] = skips;
  return (
    <Figure label="An item's states and the moves between them" caption={caption} className="marfa-lc2">
      <div className="marfa-lc2-grid">
        {skip ? (
          <div className="marfa-lc2-skip" aria-hidden="true">
            <span className="marfa-lc2-skip-start" />
            <span className="marfa-lc2-skip-run">
              <span className="marfa-lc2-skip-label">{skip.name}</span>
            </span>
            <span className="marfa-lc2-skip-end">
              <ArrowHead />
            </span>
          </div>
        ) : null}
        {states.map((state, index) => {
          const between = movesIn(index);
          return (
            <Fragment key={state.id}>
              <Box
                className="marfa-lc2-state"
                tone={state.exists ? 'default' : 'dashed'}
                icon={state.icon}
                title={state.exists ? <code>{state.id}</code> : 'Purged'}
              />
              {between.length > 0 ? (
                <Flow className="marfa-lc2-moves">
                  {between.map((move) => (
                    <Arrow
                      key={move.name}
                      label={move.name}
                      direction={indexOf(move.to) > indexOf(move.from) ? 'forward' : 'back'}
                    />
                  ))}
                </Flow>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </Figure>
  );
}
