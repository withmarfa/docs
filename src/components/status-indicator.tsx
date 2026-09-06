import { useEffect, useState } from 'react';
import { PUBLIC_MONITORS, statusUrl } from '@/lib/shared';

type ApiResponse = {
  monitors?: Record<string, { up?: boolean }>;
};

/**
 * Whether Marfa is up, in the navbar.
 *
 * The status page is only useful if it can be found while something is wrong,
 * and the navbar is where a reader already is.
 *
 * **It fails closed.** Nothing renders on an error, a timeout, or a response it
 * cannot read. A widget that reported an outage because its own fetch timed out
 * would be reporting on the status site rather than on Marfa, which is worse
 * than no widget: it would be wrong exactly when someone was relying on it.
 *
 * Cross-origin rather than a second database binding on this Worker. That
 * topology is already proven and it is not worth it here — it would put a
 * binding on the documentation site for a decoration, and this has to fail
 * closed regardless, which makes the extra round trip harmless.
 */
export function StatusIndicator() {
  const [allUp, setAllUp] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Short. This is decoration on a page that has already rendered, and a
    // reader waiting on it is a reader waiting for nothing.
    const timer = setTimeout(() => controller.abort(), 4000);

    fetch(`${statusUrl}/api/data`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ApiResponse | null) => {
        const monitors = data?.monitors;
        if (!monitors) return;
        // The public set only. The endpoint carries every monitor that is
        // checked, and a pre-production environment blipping must not turn
        // this red for every reader.
        const rendered = PUBLIC_MONITORS.map((id) => monitors[id]).filter(Boolean);
        if (rendered.length !== PUBLIC_MONITORS.length) return;
        setAllUp(rendered.every((monitor) => monitor?.up === true));
      })
      .catch(() => {
        // Deliberately silent. See above: no answer is the correct answer.
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  // Also the server render, so there is nothing for hydration to disagree with.
  if (allUp === null) return null;

  return (
    <a
      href={statusUrl}
      rel="noreferrer"
      className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:bg-fd-accent/60 hover:text-fd-accent-foreground lg:inline-flex"
    >
      <span
        className={`size-2 shrink-0 rounded-full ${allUp ? 'bg-emerald-500' : 'bg-red-500'}`}
        aria-hidden
      />
      {allUp ? 'All systems operational' : 'Service disruption'}
    </a>
  );
}
