import { useState, type ReactNode } from 'react';
import { BookOpen, RotateCcw, StickyNote, Tags } from 'lucide-react';
import { Arrow, Box, Figure, Group } from './figure';

export type Write = 'property' | 'tag' | 'extension' | 'edge';

export const writes: readonly { id: Write; label: string }[] = [
  { id: 'property', label: 'Change a property' },
  { id: 'tag', label: 'Add a tag' },
  { id: 'extension', label: 'Write an extension' },
  { id: 'edge', label: 'Add an edge' },
];

export type AnatomyState = {
  /** The note's version. */
  version: number;
  /** Whether the third edge has been added. */
  edgeAdded: boolean;
  /** The write pressed last, which the figure lights. */
  last: Write | null;
};

export const initial: AnatomyState = { version: 3, edgeAdded: false, last: null };

/**
 * What one write does to the note. Only a property write moves its version
 * (`versions/update-step`); tags and extensions don't (`versions/metadata-keeps-version`),
 * and an edge keeps a version of its own, starting at 1 (`edges/create-version`).
 */
export function apply(state: AnatomyState, write: Write): AnatomyState {
  return {
    version: write === 'property' ? state.version + 1 : state.version,
    edgeAdded: state.edgeAdded || write === 'edge',
    last: write,
  };
}

/** The one line the figure shows after a write, or before any. */
export function result(write: Write | null, version: number): string {
  switch (write) {
    case null:
      return 'Pick a write to see what it changes.';
    case 'property':
      return `The note moves to version ${version}.`;
    case 'tag':
      return `Tag added. The note stays at version ${version}.`;
    case 'extension':
      return `Extension written. The note stays at version ${version}.`;
    case 'edge':
      return `Edge added at version 1. The note stays at version ${version}.`;
  }
}

type Edge = { type: string; title: string; itemType: string };

export const edges: readonly Edge[] = [
  { type: 'about', title: 'A book', itemType: 'core.media.book' },
  { type: 'parent-of', title: 'A child note', itemType: 'core.note' },
];

/** The edge "Add an edge" writes. Its place is drawn from the start, so adding it moves nothing. */
export const newEdge: Edge = { type: 'parent-of', title: 'Another child note', itemType: 'core.note' };

function EdgeRow({ edge, lit, pending }: { edge: Edge; lit?: boolean; pending?: boolean }) {
  return (
    <div className="marfa-ix-edge" data-pending={pending || undefined}>
      <Arrow
        axis="across"
        dashed={pending}
        label={
          pending ? (
            'New edge'
          ) : (
            <>
              <code>{edge.type}</code> <span className="marfa-ix-edge-aside">version 1</span>
            </>
          )
        }
      />
      <Box
        tone={pending ? 'dashed' : 'default'}
        highlight={lit}
        icon={edge.itemType === 'core.media.book' ? BookOpen : StickyNote}
        title={pending ? 'Not written yet' : edge.title}
        subtitle={pending ? 'Add an edge to write it' : <code>{edge.itemType}</code>}
      />
    </div>
  );
}

/**
 * One note and the four places a write can land: its properties, the tags and
 * extensions in its metadata record, and the edges out of it. Pressing a write
 * lights the part it writes and says what happened to the note's version.
 * Only highlights and text change, so the layout never moves.
 */
export function ItemAnatomy({ caption }: { caption?: ReactNode }) {
  const [state, setState] = useState<AnatomyState>(initial);
  const { version, edgeAdded, last } = state;
  const all: (Write | null)[] = [null, ...writes.map((w) => w.id)];

  return (
    <Figure label="Where a write lands on an item, and what it does to the version" caption={caption} className="marfa-ix marfa-ia">
      <div className="marfa-ix-controls" role="group" aria-label="Writes">
        {writes.map((write) => (
          <button
            key={write.id}
            type="button"
            className="marfa-ix-button"
            aria-pressed={last === write.id}
            onClick={() => setState((current) => apply(current, write.id))}
          >
            {write.label}
          </button>
        ))}
        <button
          type="button"
          className="marfa-ix-button marfa-ix-reset"
          aria-label="Reset"
          title="Reset"
          onClick={() => setState(initial)}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>

      {/* Every message sits in one cell, so the line is as tall as the longest at any width. */}
      <p className="marfa-ix-result">
        {all.map((write) => (
          <span key={write ?? 'none'} aria-hidden={write !== last || undefined} data-current={write === last || undefined}>
            {result(write, version)}
          </span>
        ))}
      </p>
      <p className="marfa-ix-live" aria-live="polite">
        {last ? result(last, version) : ''}
      </p>

      <div className="marfa-ix-parts">
        <Box
          className="marfa-ix-box"
          icon={StickyNote}
          title={<code>core.note</code>}
          aside={
            <span className="marfa-ix-pill" data-lit={last === 'property' || undefined}>
              version {version}
            </span>
          }
        >
          <dl className="marfa-ix-rows" data-lit={last === 'property' || undefined}>
            <div>
              <dt>
                <code>title</code>
              </dt>
              <dd>Reading list</dd>
            </div>
            <div>
              <dt>
                <code>body</code>
              </dt>
              <dd>Start with the essays.</dd>
            </div>
          </dl>
        </Box>
        <Group label="Metadata record" icon={Tags} className="marfa-ia-metadata">
          <dl className="marfa-ix-rows">
            <div data-lit={last === 'tag' || undefined}>
              <dt>Tags</dt>
              <dd>
                <code>favorite</code>
              </dd>
            </div>
            <div data-lit={last === 'extension' || undefined}>
              <dt>Extension</dt>
              <dd>
                <code>com.example.reader</code>
              </dd>
            </div>
          </dl>
        </Group>
      </div>

      <div className="marfa-ix-edges">
        {edges.map((edge) => (
          <EdgeRow key={edge.title} edge={edge} />
        ))}
        <EdgeRow edge={newEdge} pending={!edgeAdded} lit={last === 'edge'} />
      </div>
    </Figure>
  );
}
