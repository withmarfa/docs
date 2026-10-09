import Link from 'fumadocs-core/link';
import { PencilLine, Copy, Radio, ScrollText, Webhook } from 'lucide-react';
import type { ReactNode } from 'react';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';
import { operationHref, type Operation } from './item-layers';

/** Which row of the picture a piece sits in. */
export type Row = 'write' | 'log' | 'outlet';

export type FlowPiece = DiagramNode & {
  row: Row;
  /** The operation the caption links to. */
  operation: Operation;
};

function piece(data: Omit<FlowPiece, 'caption'> & { before: ReactNode; after: ReactNode }): FlowPiece {
  const { before, after, ...rest } = data;
  return {
    ...rest,
    caption: (
      <>
        {before}{' '}
        <Link href={operationHref(data.operation)} className="marfa-diagram-caption-link">
          {data.operation.name}
        </Link>{' '}
        {after}
      </>
    ),
  };
}

/**
 * How a change reaches whoever wants to know of it. The rules are
 * withmarfa/marfa's events chapter (`events/commit-announces`,
 * `events/rollback-not-logged`, `events/ids-ascending`, `events/resume-replays-after`,
 * `events/webhook-create`, `events/delivery-signature`, `events/retry-schedule`)
 * and its read-views chapter (`read-views/copy-bootstrap`, `read-views/marker-body`).
 */
export const pieces: readonly FlowPiece[] = [
  piece({
    id: 'write',
    row: 'write',
    label: 'A write',
    icon: PencilLine,
    summary: 'Any change',
    operation: { tag: 'Items', operationId: 'createItem', name: 'Create an item' },
    before: 'A write that commits adds an event to the log.',
    after: (
      <>
        adds an <code>item.created</code>, for example. A write that is refused or rolled back adds none.
      </>
    ),
  }),
  piece({
    id: 'log',
    row: 'log',
    label: 'Event log',
    icon: ScrollText,
    summary: 'Numbered, in order',
    operation: { tag: 'Event stream', operationId: 'streamEvents', name: 'Stream change events' },
    before:
      'Marfa numbers each event as it adds it, and keeps it for at least the event log retention, seven days by default. A cursor is the number of the last event you applied.',
    after: 'replays everything after a cursor.',
  }),
  piece({
    id: 'stream',
    row: 'outlet',
    label: 'Event stream',
    icon: Radio,
    summary: 'You connect',
    operation: { tag: 'Event stream', operationId: 'streamEvents', name: 'Stream change events' },
    before:
      'You open the stream and keep the connection. Marfa replays what you missed after the cursor you send, then sends each new event as it happens.',
    after: 'opens it.',
  }),
  piece({
    id: 'copy',
    row: 'outlet',
    label: 'Copy stream',
    icon: Copy,
    summary: 'For a working copy',
    operation: { tag: 'Event stream', operationId: 'streamEvents', name: 'Stream change events' },
    before: (
      <>
        The same stream with <code>edges=all&amp;copy=1</code>. Its markers carry a read view, which tells a working copy
        that what it listed, what it fetched and what it follows belong together.
      </>
    ),
    after: 'takes the parameter.',
  }),
  piece({
    id: 'webhook',
    row: 'outlet',
    label: 'Webhook',
    icon: Webhook,
    summary: 'Marfa connects',
    operation: { tag: 'Webhooks', operationId: 'createWebhook', name: 'Create a webhook' },
    before:
      'You register a URL once. Marfa sends each event you named to it as a signed POST, and tries again when your service does not take it.',
    after: 'registers one.',
  }),
];

const inRow = (row: Row) => pieces.filter((p) => p.row === row);
const [write] = inRow('write');
const [log] = inRow('log');
const outlets = inRow('outlet');
const byId = new Map(pieces.map((p) => [p.id, p]));

/**
 * Three rows joined by two wires: a write, the event log, and the three ways
 * Marfa tells someone of an event. Selecting a piece lights the path from the
 * write down to it.
 */
export function ChangeFlow() {
  return (
    <Diagram
      label="How a change reaches an app or a service"
      nodes={pieces}
      idleCaption="Select a piece to see how a change travels from a write to whoever is told of it."
    >
      {({ selected, stateOf, toggle }) => {
        const current = selected === null ? undefined : byId.get(selected);
        const wireAbove: DiagramState = current === undefined ? 'idle' : 'on';
        const wireBelow: DiagramState =
          current === undefined ? 'idle' : current.row === 'write' ? 'off' : 'on';
        const logState: DiagramState = current === undefined ? 'idle' : 'on';
        const box = (p: FlowPiece, state: DiagramState = stateOf(p.id)) => (
          <DiagramBox key={p.id} node={p} state={state} onSelect={() => toggle(p.id)} />
        );
        return (
          <div className="marfa-cf">
            <div className="marfa-cf-center">{box(write)}</div>
            <DiagramWire className="marfa-cf-wire" state={wireAbove} />
            <div className="marfa-cf-center">{box(log, selected === log.id ? 'on' : logState)}</div>
            <DiagramWire className="marfa-cf-wire" state={wireBelow} />
            <div className="marfa-cf-group">
              <div className="marfa-cf-group-title">Tells</div>
              <div className="marfa-cf-grid">{outlets.map((p) => box(p))}</div>
            </div>
          </div>
        );
      }}
    </Diagram>
  );
}
