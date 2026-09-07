import type { StatusView } from '../lib/state';
import { formatAge } from '../lib/format';
import { StatusDot } from './status-rows';

/**
 * The answer, in a card whose tint carries it as well as the dot does.
 *
 * The page title says what this page is; the card says what it is reporting.
 * Keeping them apart is what stops the largest type on the page repeating the
 * navbar, the tab title and the hostname.
 *
 * The tint is a second channel for the same fact rather than decoration: at a
 * glance across a room the panel turning red is legible when a ten-pixel dot
 * is not.
 */
export function StatusHeader({
  title,
  view,
  now,
  subtitle,
}: {
  title: string;
  view: StatusView;
  now: number;
  subtitle?: string;
}) {
  const up = view.allUp;

  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-fd-foreground sm:text-3xl">
        {title}
      </h1>

      {subtitle ? (
        <p className="mt-2 text-sm text-fd-muted-foreground">{subtitle}</p>
      ) : null}

      <div
        className={`mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border p-4 sm:p-5 ${
          up
            ? 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40'
            : 'border-red-200/80 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40'
        }`}
      >
        <p className="flex items-center gap-2.5 text-lg font-medium text-fd-foreground">
          <StatusDot up={up} />
          {up
            ? 'All systems operational'
            : `${view.downCount} of ${view.monitors.length} systems down`}
        </p>
        {/*
          The check time is the point of this card, not a footnote. A stopped
          checker and a healthy fleet both produce a page full of green, and
          this line is the only thing that separates them.
        */}
        <p className="text-sm text-fd-muted-foreground">
          Checked {formatAge(view.lastUpdate, now)}
        </p>
      </div>
    </header>
  );
}

/** What the page says when the store has nothing in it. */
export function EmptyStore({ title }: { title: string }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-fd-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="mt-5 rounded-xl border border-fd-border bg-fd-card p-4 text-sm text-fd-muted-foreground sm:p-5">
        No recent checks are recorded. This page reports what the checker last
        wrote, so an empty store means the checks themselves have stopped rather
        than that anything is known to be healthy.
      </p>
    </header>
  );
}
