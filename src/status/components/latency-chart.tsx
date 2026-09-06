/**
 * Twelve hours of response times.
 *
 * Hand-drawn SVG rather than a charting library on purpose: this repository's
 * lockfile is merged through by a dozen worktrees at a time, and a dependency
 * added for one decoration conflicts with every one of them.
 *
 * Presentational only — no axes, no tooltip. The numbers that matter are
 * printed beside it; this is here to show shape, and a spike is the shape
 * worth seeing.
 */
export function LatencyChart({ series }: { series: number[] }) {
  if (series.length < 2) return null;

  const width = 600;
  const height = 40;
  const max = Math.max(...series);
  const min = Math.min(...series);
  // A flat series would otherwise divide by zero and draw nothing.
  const span = max - min || 1;

  const points = series.map((ping, index) => {
    const x = (index / (series.length - 1)) * width;
    const y = height - ((ping - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="mt-3 h-10 w-full text-fd-muted-foreground/60"
      role="img"
      aria-label={`Response time over the last 12 hours, between ${min} and ${max} milliseconds`}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
