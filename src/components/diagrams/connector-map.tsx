import Link from 'fumadocs-core/link';
import {
  FileJson,
  Globe,
  Handshake,
  IdCard,
  Inbox,
  Lock,
  Plug,
  Rows3,
  Webhook,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';
import { operationHref, type Operation } from './item-layers';

/** Where a piece lives, and so what it belongs to. */
export type Place = 'outside' | 'key' | 'source' | 'data';

export type ConnectorPiece = DiagramNode & {
  place: Place;
  /** The operation the caption links to, for a piece the instance holds. */
  operation?: Operation;
};

function piece(
  data: Omit<ConnectorPiece, 'caption'> & { before: ReactNode; after?: ReactNode },
): ConnectorPiece {
  const { before, after, ...rest } = data;
  const { operation } = data;
  return {
    ...rest,
    caption: operation ? (
      <>
        {before}{' '}
        <Link href={operationHref(operation)} className="marfa-diagram-caption-link">
          {operation.name}
        </Link>{' '}
        {after}
      </>
    ) : (
      before
    ),
  };
}

/**
 * A connector and what the instance keeps for it. The rules are
 * withmarfa/marfa's connectors chapter (`connectors/register-created`,
 * `connectors/hold-take`, `connectors/state-replace`,
 * `connectors/source-successor`, `connectors/agreements-written`) and its
 * inbound webhooks chapter (`inbound-webhooks/endpoint-created`,
 * `inbound-webhooks/receipt-accepted`).
 */
export const pieces: readonly ConnectorPiece[] = [
  piece({
    id: 'vendor',
    place: 'outside',
    label: 'Vendor',
    icon: Globe,
    summary: 'Another service',
    before:
      'The service the records come from. Marfa never calls it: the connector reads it, writes to it where it carries changes back, and the vendor may post webhooks to an endpoint on the instance.',
  }),
  piece({
    id: 'connector',
    place: 'outside',
    label: 'Connector',
    icon: Plug,
    summary: 'Process and key',
    before:
      'A process you run outside the server. It acts only through its own key, an ordinary working key, which the registration is made under. The server never starts it, stops it or watches it.',
  }),
  piece({
    id: 'registration',
    place: 'key',
    label: 'Registration',
    icon: IdCard,
    summary: 'Heartbeat and runs',
    operation: { tag: 'Connectors', operationId: 'registerConnector', name: 'Register a connector' },
    before: 'Ties a name to the key, one registration to a key. The connector reports a heartbeat and each run to it, and Marfa keeps the last 100 runs.',
    after: 'makes it, and answers the registration again if the key already has one.',
  }),
  piece({
    id: 'hold',
    place: 'key',
    label: 'Hold',
    icon: Lock,
    summary: 'One at a time',
    operation: { tag: 'Connectors', operationId: 'holdConnector', name: 'Take or renew a hold' },
    before:
      'A lock on the registration that one process takes under a name it chose. Only the process that holds a live hold writes the state document or the agreements, and the hold lapses when the process stops renewing it.',
    after: 'takes the hold for a process, and the same request renews it.',
  }),
  piece({
    id: 'state',
    place: 'source',
    label: 'State document',
    icon: FileJson,
    summary: 'Where to resume',
    operation: {
      tag: 'Connectors',
      operationId: 'replaceConnectorState',
      name: 'Replace the state document',
    },
    before:
      'A JSON object the connector keeps to resume from, such as a sync token. It belongs to the key’s source, so a later key with the same source reads the same document.',
    after: 'replaces it whole.',
  }),
  piece({
    id: 'agreements',
    place: 'source',
    label: 'Agreements',
    icon: Handshake,
    summary: 'One for each row',
    operation: {
      tag: 'Connectors',
      operationId: 'writeConnectorAgreements',
      name: 'Write agreements',
    },
    before:
      'The connector’s record of what it and the vendor last agreed about one row, kept beside the row and under the same source as the state document. Writing one changes nothing in the row.',
    after: 'writes and clears them.',
  }),
  piece({
    id: 'items',
    place: 'data',
    label: 'Feed items',
    icon: Rows3,
    summary: 'The rows it writes',
    operation: { tag: 'Items', operationId: 'bulkUpsertItems', name: 'Upsert items in bulk' },
    before:
      'What the connector brings in: items at the feed tier, under its source, each found again by its source ID. A person or an app promotes an item into the library.',
    after: 'writes up to 5,000 at a time.',
  }),
  piece({
    id: 'endpoint',
    place: 'data',
    label: 'Endpoint',
    icon: Webhook,
    summary: 'Vendor posts here',
    operation: {
      tag: 'Connectors',
      operationId: 'createInboundEndpoint',
      name: 'Create a webhook endpoint',
    },
    before:
      'An address on the instance where the vendor posts without a credential: the address is the credential. A registration holds at most ten live endpoints.',
    after: 'shows the address in full once.',
  }),
  piece({
    id: 'deliveries',
    place: 'data',
    label: 'Deliveries',
    icon: Inbox,
    summary: 'Stored as they came',
    operation: {
      tag: 'Connectors',
      operationId: 'listInboundDeliveries',
      name: 'List inbound deliveries',
    },
    before:
      'Each request an endpoint received, kept byte for byte. Marfa never reads one: the connector checks it came from the vendor and marks it handled.',
    after: 'lists them, oldest first.',
  }),
];

const placed = (place: Place) => pieces.filter((p) => p.place === place);
const byId = new Map(pieces.map((p) => [p.id, p]));

/**
 * The connector and its vendor outside the instance, joined by one wire to
 * what the instance keeps: what belongs to the key, what belongs to its
 * source, and what the connector writes or receives. Selecting a piece
 * lights it and the wire, and says what it belongs to.
 */
export function ConnectorMap() {
  return (
    <Diagram
      label="A connector and what the instance keeps for it"
      nodes={pieces}
      idleCaption="Select a piece to see what it is, what it belongs to, and the operation that makes it."
    >
      {({ selected, stateOf, toggle }) => {
        const current = selected === null ? undefined : byId.get(selected);
        const wire: DiagramState = current === undefined ? 'idle' : 'on';
        const box = (p: ConnectorPiece) => (
          <DiagramBox key={p.id} node={p} state={stateOf(p.id)} onSelect={() => toggle(p.id)} />
        );
        const group = (title: string, place: Place) => (
          <div className="marfa-cm-sub">
            <div className="marfa-cm-group-title">{title}</div>
            <div className="marfa-cm-grid">{placed(place).map(box)}</div>
          </div>
        );
        return (
          <div className="marfa-cm">
            <div className="marfa-cm-group">
              <div className="marfa-cm-group-title">Outside the instance</div>
              <div className="marfa-cm-grid">{placed('outside').map(box)}</div>
            </div>
            <DiagramWire className="marfa-cm-wire" state={wire} />
            <div className="marfa-cm-group">
              <div className="marfa-cm-group-title">On the instance</div>
              <div className="marfa-cm-subs">
                {group('Belongs to its key', 'key')}
                {group('Belongs to its source', 'source')}
                {group('Written and received', 'data')}
              </div>
            </div>
          </div>
        );
      }}
    </Diagram>
  );
}
