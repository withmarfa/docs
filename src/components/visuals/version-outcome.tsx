import type { ReactNode } from 'react';
import { Box, Figure } from './figure';

/** What Marfa does with the write. */
export type Outcome = 'merged' | 'conflict' | 'copy';

/**
 * The three cases. You read a note at version 3 and send a new body. Another
 * app changed the note's title meanwhile, or its body; in the last case you
 * send your write with `conflict=auto`.
 */
export type Case = 'title' | 'body' | 'auto';

export const cases: readonly { id: Case; label: ReactNode }[] = [
  { id: 'title', label: 'Title changed' },
  { id: 'body', label: 'Body changed' },
  {
    id: 'auto',
    label: (
      <>
        Body changed, <code>conflict=auto</code>
      </>
    ),
  },
];

/**
 * If the other app left the body alone, nothing collides and both changes
 * stand (`versions/merge-stale`); a title your write doesn't carry never
 * collides (`versions/collision-omitted`). If it changed the body, a plain
 * write is refused `409 version_conflict` (`versions/stale-collision`), and
 * a write sent with `conflict=auto` is settled by the type's merge policy:
 * `core.note` keeps both copies of its `body`, so the note keeps the body it
 * holds and yours goes into a conflicted copy (`versions/auto-keep-both`,
 * `versions/copy-written`).
 */
export function outcome(current: Case): Outcome {
  return current === 'title' ? 'merged' : current === 'body' ? 'conflict' : 'copy';
}

const theirs = 'Theirs';

/**
 * What Marfa answers and what the note and a conflicted copy hold after. A
 * refused write changes nothing (`versions/refused-keeps-history`).
 */
export function answer(current: Case) {
  const result = outcome(current);
  return {
    status: result === 'conflict' ? '409 version_conflict' : '200',
    title: result === 'merged' ? theirs : 'Unchanged',
    body: result === 'merged' ? 'Yours' : theirs,
    copy: result === 'copy' ? 'Yours' : 'None',
  };
}

/**
 * The three cases side by side, each with what Marfa answers and what the
 * note holds after. The accent marks the one thing the page is about, where
 * your body ends up; the refused write is dashed.
 */
export function VersionOutcome({ caption }: { caption?: ReactNode }) {
  return (
    <Figure
      label="What Marfa does with a write that names an older version, in three cases"
      caption={caption}
      className="marfa-vo"
    >
      {cases.map((item) => {
        const result = outcome(item.id);
        const after = answer(item.id);
        return (
          <Box
            key={item.id}
            className="marfa-ix-box"
            tone={result === 'conflict' ? 'dashed' : 'default'}
            title={item.label}
            subtitle={<code>{after.status}</code>}
          >
            <dl className="marfa-ix-rows">
              <div>
                <dt>
                  <code>title</code>
                </dt>
                <dd>{after.title}</dd>
              </div>
              <div data-lit={result === 'merged' || undefined}>
                <dt>
                  <code>body</code>
                </dt>
                <dd>{after.body}</dd>
              </div>
              <div data-lit={result === 'copy' || undefined}>
                <dt>Conflicted copy</dt>
                <dd>{after.copy}</dd>
              </div>
            </dl>
          </Box>
        );
      })}
    </Figure>
  );
}
