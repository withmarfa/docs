import Link from 'fumadocs-core/link';
import {
  BookOpen,
  Braces,
  ListTree,
  Puzzle,
  StickyNote,
  Tag,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { docsRoute } from '@/lib/shared';
import { groupSlug } from './api-map';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';

export type Layer = 'properties' | 'metadata' | 'edges';

/** The operation that writes a part, as the API reference names it. */
export type Operation = {
  /** The operation's tag in the API description. */
  tag: string;
  operationId: string;
  /** The operation's `summary` in the API description, which a test holds it to. */
  name: string;
};

/**
 * Whose version a write to the part moves: the item's, the edge's own, or
 * none at all.
 */
export type VersionEffect = 'item' | 'edge' | 'none';

export type ItemPart = DiagramNode & {
  layer: Layer;
  /** The sentence that says who defines the part. */
  definedBy: ReactNode;
  writtenWith: Operation;
  version: VersionEffect;
  /** For an edge: its edge type, and the item at its other end. */
  edge?: { type: string; target: { label: string; type: string; icon: LucideIcon } };
};

export function operationHref(operation: Operation): string {
  return `${docsRoute}/api-reference/${groupSlug(operation.tag)}/${operation.operationId}`;
}

const versionText: Record<VersionEffect, string> = {
  item: "Each write raises the note's version by one.",
  edge: "The edge has its own version, so the note's stays as it is.",
  none: "The note's version stays as it is.",
};

function part(
  data: Omit<ItemPart, 'caption'> & { pronoun: 'it' | 'them' | 'one' },
): ItemPart {
  const { pronoun, ...rest } = data;
  return {
    ...rest,
    caption: (
      <>
        {data.definedBy}{' '}
        <Link href={operationHref(data.writtenWith)} className="marfa-diagram-caption-link">
          {data.writtenWith.name}
        </Link>{' '}
        writes {pronoun}. {versionText[data.version]}
      </>
    ),
  };
}

function edgeLabel(type: string): ReactNode {
  return (
    <>
      <code>{type}</code> edge
    </>
  );
}

const createEdge: Operation = { tag: 'Edges', operationId: 'createEdge', name: 'Create an edge' };

/**
 * One note and its three layers. The edge types are shipped ones
 * (`edges/types-shipped` in withmarfa/marfa) and the item types are core
 * types from its `packages/types/core/`.
 */
export const parts: readonly ItemPart[] = [
  part({
    id: 'properties',
    layer: 'properties',
    label: 'Properties',
    icon: Braces,
    summary: (
      <>
        <code>title</code>, <code>body</code>
      </>
    ),
    definedBy: (
      <>
        The note&apos;s type, <code>core.note</code>, defines its properties.
      </>
    ),
    writtenWith: { tag: 'Items', operationId: 'updateItem', name: 'Update an item' },
    pronoun: 'them',
    version: 'item',
  }),
  part({
    id: 'tags',
    layer: 'metadata',
    label: 'Tags',
    icon: Tag,
    summary: <code>favorite</code>,
    definedBy: 'You or an app choose tags freely: no schema defines them.',
    writtenWith: { tag: 'Metadata', operationId: 'addItemTags', name: 'Add tags to an item' },
    pronoun: 'them',
    version: 'none',
  }),
  part({
    id: 'extensions',
    layer: 'metadata',
    label: 'Extensions',
    icon: Puzzle,
    summary: <code>com.example.reader</code>,
    definedBy: 'Whoever writes a namespace decides what it holds.',
    writtenWith: {
      tag: 'Extensions',
      operationId: 'replaceItemExtension',
      name: 'Replace an extension namespace',
    },
    pronoun: 'one',
    version: 'none',
  }),
  part({
    id: 'about',
    layer: 'edges',
    label: edgeLabel('about'),
    icon: Waypoints,
    summary: <span className="marfa-il-version">version 1</span>,
    definedBy: (
      <>
        The edge type <code>about</code> defines this edge: any item can be about any other.
      </>
    ),
    writtenWith: createEdge,
    pronoun: 'it',
    version: 'edge',
    edge: { type: 'about', target: { label: 'A book', type: 'core.media.book', icon: BookOpen } },
  }),
  part({
    id: 'parent-of',
    layer: 'edges',
    label: edgeLabel('parent-of'),
    icon: ListTree,
    summary: <span className="marfa-il-version">version 1</span>,
    definedBy: (
      <>
        The edge type <code>parent-of</code> defines this edge: an item has one parent at most,
        and trashing the parent trashes its children.
      </>
    ),
    writtenWith: createEdge,
    pronoun: 'it',
    version: 'edge',
    edge: { type: 'parent-of', target: { label: 'A child note', type: 'core.note', icon: StickyNote } },
  }),
];

const byLayer = (layer: Layer) => parts.filter((p) => p.layer === layer);
const properties = byLayer('properties');
const metadata = byLayer('metadata');
const edges = byLayer('edges');
const byId = new Map(parts.map((p) => [p.id, p]));

/**
 * A note in the middle with its three layers: its properties inside it, a
 * metadata record of tags and extensions beside it, and edges out to two
 * other items. Selecting a part says who defines it, which operation writes
 * it, and whether the write moves the note's version, which the version
 * label on the note shows lit or dimmed.
 *
 * Narrow, the metadata record sits under the note and the edges hang from a
 * rail that runs down past it, each target under its edge. Wide, the record
 * sits beside the note and each target beside its edge.
 */
export function ItemLayers() {
  return (
    <Diagram
      label="Where an item's data lives"
      nodes={parts}
      idleCaption="Select a part of the note to see who defines it, which operation writes it, and whether a write moves the note's version."
    >
      {({ selected, stateOf, toggle }) => {
        const current = selected === null ? undefined : byId.get(selected);
        const itemVersion: DiagramState =
          current === undefined ? 'idle' : current.version === 'item' ? 'on' : 'off';
        const selectedEdge = edges.findIndex((p) => p.id === selected);
        // The path to a selected edge runs down the rail past the metadata
        // record and every edge above it, so those segments light with it.
        const along = (index: number): DiagramState =>
          selectedEdge === -1 ? 'idle' : index <= selectedEdge ? 'on' : 'off';
        const past = (index: number): DiagramState =>
          selectedEdge === -1 ? 'idle' : index < selectedEdge ? 'on' : 'off';

        return (
          <div className="marfa-il">
            <div className="marfa-il-item">
              <div className="marfa-il-item-head">
                <div className="marfa-diagram-box-title">
                  <StickyNote aria-hidden="true" />
                  <span>Note</span>
                  <code className="marfa-il-type">core.note</code>
                </div>
                <span className="marfa-il-version" data-state={itemVersion}>
                  version 3
                </span>
              </div>
              {properties.map((p) => (
                <DiagramBox key={p.id} node={p} state={stateOf(p.id)} onSelect={() => toggle(p.id)} />
              ))}
            </div>

            <div className="marfa-il-meta">
              <DiagramWire className="marfa-il-rail-past" state={along(0)} />
              <div className="marfa-il-meta-title">Metadata</div>
              {metadata.map((p) => (
                <DiagramBox key={p.id} node={p} state={stateOf(p.id)} onSelect={() => toggle(p.id)} />
              ))}
            </div>

            <ul className="marfa-il-edges">
              {edges.map((p, index) => {
                const state = stateOf(p.id);
                const target = p.edge!.target;
                const targetNode: DiagramNode = {
                  id: `${p.id}-target`,
                  label: target.label,
                  icon: target.icon,
                  summary: <code>{target.type}</code>,
                  caption: p.caption,
                };
                return (
                  <li key={p.id} className="marfa-il-edge">
                    <div className="marfa-il-edge-head">
                      <DiagramWire className="marfa-il-rail-in" state={along(index)} />
                      <DiagramWire className="marfa-il-rail-through" state={past(index)} />
                      <DiagramWire className="marfa-il-wire" state={state} />
                      <DiagramBox
                        className="marfa-il-edge-box"
                        node={p}
                        state={state}
                        onSelect={() => toggle(p.id)}
                      />
                    </div>
                    <div className="marfa-il-end">
                      <DiagramWire className="marfa-il-rail-through" state={past(index)} />
                      <DiagramWire className="marfa-il-arrow" state={state} />
                      <DiagramBox
                        className="marfa-il-target"
                        node={targetNode}
                        state={state}
                        onSelect={() => toggle(p.id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }}
    </Diagram>
  );
}
