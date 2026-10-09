import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'fumadocs-core/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The shared pieces of an interactive diagram: a frame with a row of chips, a
 * canvas the diagram draws, and a caption that names the selection.
 *
 * A diagram is data. It lists its nodes, and the frame owns which one is
 * selected. Selecting a node lights it and its wire, dims the rest, and puts
 * its caption under the canvas; selecting it again, or pressing Escape, goes
 * back to the whole picture.
 *
 * Nothing is selected in the server render, so the page shows the whole
 * diagram before any JavaScript runs.
 */

export type DiagramNode = {
  id: string;
  /** The chip's text and the box's title. */
  label: ReactNode;
  icon: LucideIcon;
  /** A few words inside the box. */
  summary: ReactNode;
  /** One sentence shown under the canvas while the node is selected. */
  caption: ReactNode;
  /** The tag for something that doesn't exist yet, such as "Coming soon". */
  planned?: { tag: string };
};

/** `idle` while nothing is selected, so everything shows at full strength. */
export type DiagramState = 'idle' | 'on' | 'off';

export type DiagramSelection = {
  selected: string | null;
  stateOf: (id: string) => DiagramState;
  toggle: (id: string) => void;
};

export function Diagram({
  label,
  nodes,
  idleCaption,
  controls,
  children,
}: {
  /** Names the diagram for assistive technology. */
  label: string;
  nodes: readonly DiagramNode[];
  idleCaption: ReactNode;
  /** Shown at the end of the chip row, such as a switch that changes what the diagram draws. */
  controls?: ReactNode;
  children: (selection: DiagramSelection) => ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const figure = useRef<HTMLElement>(null);
  const caption = useRef<HTMLElement>(null);

  // A caption that sticks to the bottom of the screen can cover the control
  // that has focus. Publish its real height so the stylesheet can keep focus
  // out from under it. A selection changes the caption's text, so measure it
  // before the next paint rather than on the observer's next frame; the
  // observer catches a change of width or text size.
  useLayoutEffect(() => {
    const frame = figure.current;
    const element = caption.current;
    if (!frame || !element) return;
    const publish = () => frame.style.setProperty('--marfa-diagram-caption-height', `${element.offsetHeight}px`);
    publish();
    // Selecting the control that already has focus moves no focus, so the
    // margin alone would leave it under the caption that just became sticky.
    const focused = document.activeElement;
    if (selected !== null && focused instanceof HTMLElement && frame.contains(focused)) {
      focused.scrollIntoView({ block: 'nearest' });
    }
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selected]);

  // A node can leave the diagram, as Marfa Cloud does when its switch is off.
  // Its selection goes with it, or everything else would stay dimmed.
  useEffect(() => {
    if (selected !== null && !nodes.some((node) => node.id === selected)) setSelected(null);
  }, [nodes, selected]);

  const selection: DiagramSelection = {
    selected,
    stateOf: (id) => (selected === null ? 'idle' : selected === id ? 'on' : 'off'),
    toggle: (id) => setSelected((current) => (current === id ? null : id)),
  };

  const current = nodes.find((node) => node.id === selected);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && selected !== null) {
      event.stopPropagation();
      setSelected(null);
    }
  }

  return (
    <figure
      ref={figure}
      className="marfa-diagram not-prose"
      aria-label={label}
      data-selected={selected ?? undefined}
      onKeyDown={onKeyDown}
    >
      <div className="marfa-diagram-head">
        <div className="marfa-diagram-chips" role="group" aria-label={`${label}: choose a piece`}>
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className="marfa-diagram-chip"
              aria-pressed={selected === node.id}
              onClick={() => selection.toggle(node.id)}
            >
              {node.label}
            </button>
          ))}
        </div>
        {controls}
      </div>

      <div className="marfa-diagram-canvas">{children(selection)}</div>

      <figcaption ref={caption} className="marfa-diagram-caption" aria-live="polite">
        {current ? current.caption : idleCaption}
      </figcaption>
    </figure>
  );
}

/**
 * One node drawn as a box. Clicking it selects it like its chip does. It is
 * not a second focus stop: the chips are the keyboard's way in, and two
 * buttons per node would double every Tab.
 *
 * With `href`, the title is a link to that page, and a click on it goes there
 * instead of selecting. The link is a focus stop, because it goes somewhere
 * no chip does.
 */
export function DiagramBox({
  node,
  state,
  onSelect,
  href,
  className,
}: {
  node: DiagramNode;
  state: DiagramState;
  onSelect: () => void;
  href?: string;
  className?: string;
}) {
  const Icon = node.icon;

  return (
    <div
      className={cn('marfa-diagram-box', className)}
      data-state={state}
      onClick={onSelect}
    >
      <div className="marfa-diagram-box-title">
        <Icon aria-hidden="true" />
        {href ? (
          <Link
            href={href}
            className="marfa-diagram-box-link"
            onClick={(event) => event.stopPropagation()}
          >
            {node.label}
          </Link>
        ) : (
          <span>{node.label}</span>
        )}
      </div>
      <div className="marfa-diagram-box-summary">{node.summary}</div>
    </div>
  );
}

/** An on and off switch for the diagram's chip row. */
export function DiagramSwitch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="marfa-diagram-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="marfa-diagram-switch-track" aria-hidden="true">
        <span className="marfa-diagram-switch-thumb" />
      </span>
      {children}
    </button>
  );
}

/** A line between two boxes, lit with the node it belongs to. */
export function DiagramWire({ state, className }: { state: DiagramState; className?: string }) {
  return (
    <span className={cn('marfa-diagram-wire', className)} data-state={state} aria-hidden="true" />
  );
}
