import type { Incident, MonitorView } from '../lib/state';
import { formatAbsolute, formatDuration } from '../lib/format';
import { describeCause, groupIncidents } from '../lib/events';
import { LatencyChart } from './latency-chart';
import { UptimeBar } from './uptime-bar';

export function StatusDot({ up }: { up: boolean }) {
  return (
    <span
      className={`inline-flex size-2.5 shrink-0 rounded-full ${
        up ? 'bg-emerald-500' : 'bg-red-500'
      }`}
      aria-hidden
    />
  );
}

export function MonitorRow({ monitor, now }: { monitor: MonitorView; now: number }) {
  return (
    <li className="rounded-xl border border-fd-border bg-fd-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-center gap-2 text-base font-medium text-fd-foreground">
          <StatusDot up={monitor.up} />
          {monitor.link ? (
            <a
              href={monitor.link}
              className="underline-offset-4 hover:underline"
              rel="noreferrer"
            >
              {monitor.name}
            </a>
          ) : (
            monitor.name
          )}
        </h2>
        <p
          className={`text-sm font-medium ${
            monitor.up
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          {monitor.up ? 'Operational' : 'Down'}
        </p>
      </div>

      {monitor.tooltip ? (
        <p className="mt-1 text-xs text-fd-muted-foreground">{monitor.tooltip}</p>
      ) : null}

      {monitor.up ? null : (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">
          {monitor.error ?? 'Not responding'}
          {monitor.downSince
            ? `, since ${formatAbsolute(monitor.downSince)} and lasting ${formatDuration(
                now - monitor.downSince,
              )} so far`
            : null}
        </p>
      )}

      {/*
        Chart first, then the bar. Both are a horizontal time axis and the bar
        is the wider window, so putting it last lets a reader zoom out as they
        move down the row instead of jumping from ninety days to twelve hours
        and back.
      */}
      <LatencyChart series={monitor.series} seconds={monitor.seriesSeconds} />

      <UptimeBar
        days={monitor.days}
        uptime={monitor.uptime}
        observedDays={monitor.observedDays}
      />

      {/*
        "measured from" rather than "from". The location is where the check ran,
        not where Marfa is, and the bare preposition reads as the latter — which
        then invites a reader to treat the figure as their own latency.
      */}
      {monitor.latencyMs === null ? null : (
        <p className="mt-3 border-t border-fd-border pt-3 text-xs text-fd-muted-foreground">
          Last check <span className="text-fd-foreground">{monitor.latencyMs} ms</span>
          {monitor.location ? `, measured from ${monitor.location}` : null}
        </p>
      )}
    </li>
  );
}

/**
 * The history, one row per event rather than one per monitor.
 *
 * A table because four facts about each event are the same four every time,
 * and a column is what lets a reader compare them without reading. The
 * grouping is the substantive part: see `events.ts` for why one outage
 * previously produced two entries.
 */
export function IncidentTable({ incidents }: { incidents: Incident[] }) {
  const events = groupIncidents(incidents);

  if (events.length === 0) {
    return (
      <p className="mt-4 text-sm text-fd-muted-foreground">
        No incidents recorded in the last 90 days.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-lg text-left text-sm">
        <thead>
          <tr className="border-b border-fd-border text-xs font-medium text-fd-muted-foreground">
            <th scope="col" className="py-2 pr-4 font-medium">
              Started
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Affected
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Duration
            </th>
            <th scope="col" className="py-2 font-medium">
              Cause
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-fd-border">
          {events.map((event) => (
            <tr key={`${event.monitorIds.join('-')}-${event.start}`}>
              <td className="py-2.5 pr-4 whitespace-nowrap text-fd-muted-foreground">
                {formatAbsolute(event.start)}
              </td>
              <td className="py-2.5 pr-4 text-fd-foreground">
                {event.monitorNames.join(', ')}
              </td>
              {/*
                An open event has no duration worth printing. Rendering one
                would grow on every reload and read as a measurement rather
                than as the clock it is.
              */}
              <td className="py-2.5 pr-4 whitespace-nowrap text-fd-muted-foreground">
                {event.end === null ? (
                  <span className="text-red-700 dark:text-red-400">Ongoing</span>
                ) : (
                  formatDuration(event.durationSeconds)
                )}
              </td>
              <td className="py-2.5 text-fd-muted-foreground">
                {describeCause(event.error)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
