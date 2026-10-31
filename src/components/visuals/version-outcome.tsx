import { StickyNote } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box, Figure } from './figure';
import { Choices, Controls, Result } from './interactive';

/** What Marfa does with the write. */
export type Outcome = 'merged' | 'conflict' | 'copy';

/**
 * The three cases, one for each outcome. Your write changes only the body.
 * In the first, the other app changed only the title; in the other two it
 * changed the body as well, and the last sends your write with `conflict=auto`.
 */
export type Case = 'different' | 'same' | 'auto';

export const cases: readonly { id: Case; label: ReactNode }[] = [
  { id: 'different', label: 'Different fields' },
  { id: 'same', label: 'Same field' },
  {
    id: 'auto',
    label: (
      <>
        Same field, <code>conflict=auto</code>
      </>
    ),
  },
];

/** The sequence above the figure has the other app change the title. */
export const initial: Case = 'different';

/** The field the other app changed in each case. */
export function otherChanged(current: Case): 'title' | 'body' {
  return current === 'different' ? 'title' : 'body';
}

/**
 * If the other app left the body alone, nothing collides and both changes
 * stand (`versions/merge-stale`); a title your write doesn't carry never
 * collides (`versions/collision-omitted`). If it changed the body too, a
 * plain write is refused `409 version_conflict` (`versions/stale-collision`),
 * and a write sent with `conflict=auto` is settled by the type's merge
 * policy: `core.note` keeps both copies of its `body`, so yours goes into a
 * conflicted copy (`versions/auto-keep-both`, `versions/copy-written`).
 */
export function outcome(current: Case): Outcome {
  return current === 'different' ? 'merged' : current === 'same' ? 'conflict' : 'copy';
}

/** What the answer's note holds in each field, and its version (`versions/merge-version`). */
export function answer(current: Case) {
  const result = outcome(current);
  return {
    status: result === 'conflict' ? '409 version_conflict' : '200',
    version: result === 'conflict' ? 4 : 5,
    title: result === 'conflict' ? 'As it is now' : result === 'merged' ? "The other app's" : 'Unchanged',
    body: result === 'merged' ? 'Yours' : result === 'conflict' ? 'As it is now' : "The other app's",
  };
}

export const messages: Record<Outcome, string> = {
  merged:
    'Both changes stand. The other app changed the title and you changed the body, so nothing collides, with or without `conflict=auto`.',
  conflict:
    'Both apps changed the body, so Marfa refuses your write with `409 version_conflict` and sends back the note as it is now, for you to combine and send again.',
  copy: "Marfa keeps both bodies. The note keeps the other app's body, and yours goes into a conflicted copy, a new note linked to the original.",
};

/**
 * A note you read at version 3, which another app has since changed, and the
 * write you send that names version 3. One control picks the case, and the
 * figure shows what Marfa answers and what the note holds after. Only
 * highlights and text change, so the layout never moves.
 */
export function VersionOutcome({ caption }: { caption?: ReactNode }) {
  const [current, setCurrent] = useState<Case>(initial);
  const result = outcome(current);
  const after = answer(current);
  const changed = (field: 'title' | 'body') => otherChanged(current) === field;

  return (
    <Figure
      label="What Marfa does with a write that names an older version, by what the other app changed"
      caption={caption}
      className="marfa-ix marfa-vo"
    >
      <Controls onReset={() => setCurrent(initial)}>
        <Choices label="The two writes change" options={cases} value={current} onChange={setCurrent} />
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
                <dd>{changed(field) ? 'Changed by the other app' : 'As you read it'}</dd>
              </div>
            ))}
          </dl>
        </Box>
        <div className="marfa-vo-after">
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
            subtitle="Your write: a new body, based on version 3"
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
          <Box
            className="marfa-ix-box"
            tone={result === 'copy' ? 'default' : 'dashed'}
            highlight={result === 'copy'}
            icon={StickyNote}
            title={result === 'copy' ? 'A conflicted copy' : 'No conflicted copy'}
            subtitle={
              result === 'copy' ? (
                <>
                  Your body, linked by <code>derived-from</code>
                </>
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
