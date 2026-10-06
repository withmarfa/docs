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
 * **A dot and nothing else.** The state has two values and one of them is the
 * boring one, so a sentence of chrome sat in the navbar all day saying nothing
 * had happened. The wording moves to the tooltip, which is where a reader goes
 * once the dot has told them there is something to ask about.
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
        // The public set only, which the endpoint reports and this list
        // names. A monitor missing from the response fails closed.
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

  const label = allUp ? 'All systems operational' : 'Service disruption';

  return (
    <a
      href={statusUrl}
      rel="noreferrer"
      // `title` rather than a tooltip component: this is the last item before
      // the icon row and it has to match those visually, and they are plain
      // anchors too.
      title={label}
      aria-label={label}
      // The notebook navbar's own icon buttons, written out. They are styled by
      // the layout rather than by anything importable, so matching them means
      // repeating them: ghost button, `icon-sm` padding, muted until hover.
      className="inline-flex items-center justify-center rounded-md p-1.5 text-fd-muted-foreground transition-colors duration-100 hover:bg-fd-accent hover:text-fd-accent-foreground max-lg:hidden"
    >
      {/* Sized to the icons beside it so the row keeps one baseline, with the
          dot centred inside rather than filling it. */}
      <span className="flex size-4.5 items-center justify-center">
        <span
          className={`size-2 rounded-full ${allUp ? 'bg-emerald-500' : 'bg-red-500'}`}
          aria-hidden
        />
      </span>
    </a>
  );
}
