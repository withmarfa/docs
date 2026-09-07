import type { StatusView } from '../lib/state';
import { formatAge } from '../lib/format';
import { StatusDot } from './status-rows';

/**
 * The answer, in a card whose tint carries it as well as the dot does.
 *
 * There is no page title above it. The navbar already says what this site is,
 * and repeating it in the largest type on the page spent that position on
 * something the reader could see in three other places.
 *
 * So the state is the heading, in both senses: it is the `h1`, and it is the
 * first thing on the page. The tint is a second channel for the same fact
 * rather than decoration — at a glance across a room the panel turning red is
 * legible when a ten-pixel dot is not.
 */
export function StatusHeader({
  view,
  now,
  note,
}: {
  view: StatusView;
  now: number;
  /** A line beneath the card, for a page that is not the default one. */
  note?: string;
}) {
  const up = view.allUp;

  return (
    <header>
      <div
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border p-4 sm:p-5 ${
          up
            ? 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40'
            : 'border-red-200/80 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40'
        }`}
      >
        <h1 className="flex items-center gap-2.5 text-lg font-medium text-fd-foreground">
          <StatusDot up={up} />
          {up
            ? 'All systems operational'
            : `${view.downCount} of ${view.monitors.length} systems down`}
        </h1>
        {/*
          The check time is the point of this card, not a footnote. A stopped
          checker and a healthy fleet both produce a page full of green, and
          this line is the only thing that separates them.
        */}
        <p className="text-sm text-fd-muted-foreground">
          Checked {formatAge(view.lastUpdate, now)}
        </p>
      </div>

      {note ? <p className="mt-3 text-sm text-fd-muted-foreground">{note}</p> : null}
    </header>
  );
}

/**
 * What the page says when the store has nothing in it.
 *
 * Deliberately not a quiet empty state. Nothing recorded is not the same as
 * nothing wrong, and this is the one case where the page cannot answer its own
 * question at all.
 */
export function EmptyStore() {
  return (
    <header>
      <h1 className="text-xl font-semibold tracking-tight text-fd-foreground sm:text-2xl">
        No recent checks recorded
      </h1>
      <p className="mt-3 rounded-xl border border-fd-border bg-fd-card p-4 text-sm text-fd-muted-foreground sm:p-5">
        This page reports what the checker last wrote, so an empty store means the
        checks themselves have stopped rather than that anything is known to be
        healthy.
      </p>
    </header>
  );
}
