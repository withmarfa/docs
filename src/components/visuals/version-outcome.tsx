import { StickyNote } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Arrow, Box, Figure } from './figure';
import { Choices, Controls, Result } from './interactive';

/** What the other app changed since the version your write names. */
export type Change = 'title' | 'body' | 'both';

/** How your write is sent: plain, or asking Marfa to settle a collision (`conflict=auto`). */
export type Mode = 'plain' | 'auto';

/** What Marfa does with the write. */
export type Outcome = 'merged' | 'conflict' | 'copy';

export const changes: readonly { id: Change; label: string }[] = [
  { id: 'title', label: 'The title' },
  { id: 'body', label: 'The body' },
  { id: 'both', label: 'Title and body' },
];

export const modes: readonly { id: Mode; label: ReactNode }[] = [
  { id: 'plain', label: 'Plain' },
  { id: 'auto', label: <code>conflict=auto</code> },
];

export type State = { change: Change; mode: Mode };

/** The note's body is what your write changes, and the other app has changed the title first. */
export const initial: State = { change: 'title', mode: 'plain' };

/**
 * Your write changes only the body, and names the version you read. If the
 * other app left the body alone, nothing collides and both changes stand
 * (`versions/merge-stale`). If it changed the body too, a plain write is
 * refused `409 version_conflict` (`versions/stale-collision`), and a write
 * sent with `conflict=auto` is settled by the type's merge policy: `core.note`
 * keeps both copies of its `body`, so yours goes into a conflicted copy
 * (`versions/auto-keep-both`, `versions/copy-written`). A title the other app
 * changed is not carried by your write, so it never collides
 * (`versions/collision-omitted`).
 */
export function outcome({ change, mode }: State): Outcome {
  if (change === 'title') return 'merged';
  return mode === 'auto' ? 'copy' : 'conflict';
}

/** What the answer's note holds in each field, and its version (`versions/merge-version`). */
export function answer(state: State) {
  const result = outcome(state);
  const titleChanged = state.change !== 'body';
  return {
    status: result === 'conflict' ? '409 version_conflict' : '200',
    version: result === 'conflict' ? 4 : 5,
    title: result === 'conflict' ? 'As it is now' : titleChanged ? "The other app's" : 'Unchanged',
    body: result === 'merged' ? 'Yours' : result === 'conflict' ? 'As it is now' : "The other app's",
  };
}

export const messages: Record<Outcome, string> = {
  merged:
    'Both changes stand. Only the title changed since version 3 and your write changes only the body, so nothing collides, with or without `conflict=auto`.',
  conflict:
    'Marfa refuses the write with `409 version_conflict`. Both apps changed the body, so it sends back the note as it is now for you to combine and send again.',
  copy: "Marfa keeps both bodies. The note keeps the other app's body, and yours goes into a conflicted copy, a new note linked to the original.",
};

/**
 * A note you read at version 3, which another app has since changed, and the
 * write you send that names version 3. Choose what the other app changed and
 * how you send your write, and the figure shows what Marfa answers and what
 * the note holds after. Only highlights and text change, so the layout never
 * moves.
 */
export function VersionOutcome({ caption }: { caption?: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const result = outcome(state);
  const after = answer(state);
  const changed = (field: 'title' | 'body') => state.change === 'both' || state.change === field;

  return (
    <Figure
      label="What Marfa does with a write that names an older version, by what the other app changed"
      caption={caption}
      className="marfa-ix marfa-vo"
    >
      <Controls onReset={() => setState(initial)}>
        <Choices
          label="The other app changed"
          options={changes}
          value={state.change}
          onChange={(change) => setState((current) => ({ ...current, change }))}
        />
        <Choices
          label="You send"
          options={modes}
          value={state.mode}
          onChange={(mode) => setState((current) => ({ ...current, mode }))}
        />
      </Controls>

      <Result messages={messages} current={result} />

      <div className="marfa-ix-parts">
        <Box
          className="marfa-ix-box"
          icon={StickyNote}
          title="The note now"
          aside={<span className="marfa-ix-pill">version 4</span>}
          subtitle={<code>core.note</code>}
        >
          <dl className="marfa-ix-rows">
            {(['title', 'body'] as const).map((field) => (
              <div key={field} data-lit={changed(field) || undefined}>
                <dt>
                  <code>{field}</code>
                </dt>
                <dd>{changed(field) ? 'Changed since version 3' : 'Not changed'}</dd>
              </div>
            ))}
          </dl>
        </Box>
        <Box
          className="marfa-ix-box"
          tone={result === 'conflict' ? 'dashed' : 'default'}
          highlight={result !== 'conflict'}
          title={<code>{after.status}</code>}
          aside={
            <span className="marfa-ix-pill" data-lit={result !== 'conflict' || undefined}>
              version {after.version}
            </span>
          }
          subtitle="To your write: change the body, at version 3"
        >
          <dl className="marfa-ix-rows">
            <div>
              <dt>
                <code>title</code>
              </dt>
              <dd>{after.title}</dd>
            </div>
            <div>
              <dt>
                <code>body</code>
              </dt>
              <dd>{after.body}</dd>
            </div>
          </dl>
        </Box>
      </div>

      <div className="marfa-ix-edges">
        <div className="marfa-ix-edge" data-pending={result !== 'copy' || undefined}>
          <Arrow axis="across" direction="back" dashed={result !== 'copy'} label={<code>derived-from</code>} />
          <Box
            className="marfa-ix-box"
            tone={result === 'copy' ? 'default' : 'dashed'}
            highlight={result === 'copy'}
            icon={StickyNote}
            title={result === 'copy' ? 'Conflicted copy' : 'No conflicted copy'}
            subtitle={
              result === 'copy' ? (
                'Holds your body, at version 1'
              ) : result === 'conflict' ? (
                <>
                  Written only with <code>conflict=auto</code>
                </>
              ) : (
                'Nothing collided'
              )
            }
          />
        </div>
      </div>
    </Figure>
  );
}
