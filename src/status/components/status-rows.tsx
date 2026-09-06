import type { Incident, MonitorView } from '../lib/state';
import { formatAbsolute, formatDuration } from '../lib/format';
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

      <UptimeBar days={monitor.days} uptime={monitor.uptime} />

      <LatencyChart series={monitor.series} seconds={monitor.seriesSeconds} />

      {monitor.latencyMs === null ? null : (
        <p className="mt-3 border-t border-fd-border pt-3 text-xs text-fd-muted-foreground">
          Last check <span className="text-fd-foreground">{monitor.latencyMs} ms</span>
          {monitor.location ? ` from ${monitor.location}` : null}
        </p>
      )}
    </li>
  );
}

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return (
      <p className="text-sm text-fd-muted-foreground">
        No incidents recorded in the last 90 days.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {incidents.map((incident) => (
        <li
          key={`${incident.monitorId}-${incident.start}`}
          className="border-l-2 border-fd-border pl-4"
        >
          <p className="text-sm font-medium text-fd-foreground">
            {incident.monitorName}
            {incident.end === null ? (
              <span className="ml-2 font-normal text-red-700 dark:text-red-400">
                ongoing
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-fd-muted-foreground">
            {formatAbsolute(incident.start)}, lasting{' '}
            {formatDuration(incident.durationSeconds)}
          </p>
          <p className="mt-1 text-xs text-fd-muted-foreground">{incident.error}</p>
        </li>
      ))}
    </ol>
  );
}
