import { useState, type KeyboardEvent, type ReactNode } from 'react';
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
  /** Drawn dashed and tagged, for something that doesn't exist yet. */
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
  children,
}: {
  /** Names the diagram for assistive technology. */
  label: string;
  nodes: readonly DiagramNode[];
  idleCaption: ReactNode;
  children: (selection: DiagramSelection) => ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);

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
      className="marfa-diagram not-prose"
      aria-label={label}
      data-selected={selected ?? undefined}
      onKeyDown={onKeyDown}
    >
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

      <div className="marfa-diagram-canvas">{children(selection)}</div>

      <figcaption className="marfa-diagram-caption" aria-live="polite">
        {current ? current.caption : idleCaption}
      </figcaption>
    </figure>
  );
}

/**
 * One node drawn as a box. Clicking it selects it like its chip does. It is
 * not a second focus stop: the chips are the keyboard's way in, and two
 * buttons per node would double every Tab.
 */
export function DiagramBox({
  node,
  state,
  onSelect,
  className,
}: {
  node: DiagramNode;
  state: DiagramState;
  onSelect: () => void;
  className?: string;
}) {
  const Icon = node.icon;

  return (
    <div
      className={cn('marfa-diagram-box', className)}
      data-state={state}
      data-planned={node.planned ? true : undefined}
      onClick={onSelect}
    >
      <div className="marfa-diagram-box-title">
        <Icon aria-hidden="true" />
        <span>{node.label}</span>
      </div>
      <div className="marfa-diagram-box-summary">{node.summary}</div>
      {node.planned ? <span className="marfa-diagram-tag">{node.planned.tag}</span> : null}
    </div>
  );
}

/** A line between two boxes, lit with the node it belongs to. */
export function DiagramWire({ state, className }: { state: DiagramState; className?: string }) {
  return (
    <span className={cn('marfa-diagram-wire', className)} data-state={state} aria-hidden="true" />
  );
}
