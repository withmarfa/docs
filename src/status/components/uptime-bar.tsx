import type { DayCell } from '../lib/state';
import { formatAbsolute, formatDuration, formatUptime } from '../lib/format';

const FILL: Record<DayCell['status'], string> = {
  up: 'bg-emerald-500',
  partial: 'bg-amber-400',
  down: 'bg-red-500',
  // Not a degraded state. The absence of one.
  unknown: 'bg-fd-border',
};

function describe(day: DayCell): string {
  const date = formatAbsolute(day.start).replace(/,.*/, '');
  if (day.status === 'unknown') return `${date}: not monitored`;
  if (day.downSeconds === 0) return `${date}: no incidents`;
  return `${date}: down for ${formatDuration(day.downSeconds)}`;
}

/**
 * Ninety days, one cell each, oldest on the left.
 *
 * The line chart below says how fast; this says whether, and over a window long
 * enough to be worth looking at. A grey cell means the checker was not running
 * yet — painting those green would be a claim about days nobody watched, which
 * is why the store records when observation began.
 */
export function UptimeBar({ days, uptime }: { days: DayCell[]; uptime: number }) {
  const observed = days.some((day) => day.status !== 'unknown');

  return (
    <div className="mt-4">
      <div className="flex h-9 items-stretch gap-px" role="img" aria-label="Daily availability over the last 90 days">
        {days.map((day) => (
          <span
            key={day.start}
            title={describe(day)}
            className={`min-w-0 flex-1 rounded-[1.5px] ${FILL[day.status]}`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2 text-xs text-fd-muted-foreground">
        <span>90 days ago</span>
        <span className="text-fd-foreground">
          {observed ? `${formatUptime(uptime)} uptime` : 'no history yet'}
        </span>
        <span>Today</span>
      </div>
    </div>
  );
}
