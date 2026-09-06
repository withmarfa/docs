/**
 * Response time over the window the checker retains.
 *
 * Hand-drawn SVG rather than a charting library: this repository's lockfile is
 * merged through by a dozen worktrees at a time, and a dependency added for one
 * chart conflicts with every one of them.
 *
 * The gridlines and the labels below it are the point. Without them the line
 * showed a shape with no scale and no clock, which reads as decoration; with
 * them it answers when a spike happened and how big it was.
 */
export function LatencyChart({ series, seconds }: { series: number[]; seconds: number }) {
  if (series.length < 2) return null;

  const width = 600;
  const height = 56;
  const pad = 3;
  const max = Math.max(...series);
  const min = Math.min(...series);
  // A flat series would otherwise divide by zero and draw a line off the top.
  const span = max - min || 1;

  const x = (index: number) => (index / (series.length - 1)) * width;
  const y = (ping: number) => height - pad - ((ping - min) / span) * (height - pad * 2);

  const points = series.map((ping, index) => `${x(index).toFixed(1)},${y(ping).toFixed(1)}`);
  const area = `0,${height} ${points.join(' ')} ${width},${height}`;

  const hours = Math.max(1, Math.round(seconds / 3600));
  const half = Math.round(hours / 2);

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-2 text-xs text-fd-muted-foreground">
        <span>Response time</span>
        <span>
          <span className="text-fd-foreground">{min}</span> to{' '}
          <span className="text-fd-foreground">{max}</span> ms
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="mt-1.5 h-14 w-full"
        role="img"
        aria-label={`Response time over the last ${hours} hours, between ${min} and ${max} milliseconds`}
      >
        {[0.25, 0.5, 0.75].map((at) => (
          <line
            key={at}
            x1={width * at}
            x2={width * at}
            y1={0}
            y2={height}
            className="stroke-fd-border"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polygon points={area} className="fill-emerald-500/10" />
        <polyline
          points={points.join(' ')}
          fill="none"
          className="stroke-emerald-600 dark:stroke-emerald-400"
          strokeWidth={1.25}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-1.5 flex items-baseline justify-between text-xs text-fd-muted-foreground">
        <span>{hours}h ago</span>
        <span>{half}h ago</span>
        <span>Now</span>
      </div>
    </div>
  );
}
