import Link from 'fumadocs-core/link';
import { Cloud, FileImage, HardDrive, History, Puzzle, Shapes, Waypoints } from 'lucide-react';
import type { ReactNode } from 'react';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';
import { operationHref, type Operation } from './item-layers';

/** Which tier of the picture a piece sits in. */
export type Tier = 'referrer' | 'blob' | 'store';

export type FilePiece = DiagramNode & {
  tier: Tier;
  /** The operation the caption links to. */
  operation: Operation;
  /**
   * For a referrer, which keeps the blob from the `blob-orphans` sweep: the
   * credentials its reference can lend the blob's read to, or `null` for one
   * that lends no read.
   */
  reference?: { lendsTo: ReactNode | null };
};

/** A referrer's caption ends with what it keeps and whom it can lend to. */
function referrer(
  data: Omit<FilePiece, 'caption' | 'tier' | 'reference'> & {
    before: ReactNode;
    verb: string;
    lendsTo: ReactNode | null;
  },
): FilePiece {
  const { verb, lendsTo, ...rest } = data;
  return piece({
    ...rest,
    tier: 'referrer',
    reference: { lendsTo },
    after: (
      <>
        {verb}.{' '}
        {lendsTo === null ? (
          'It keeps the blob from the orphan sweep, but lends no read.'
        ) : (
          <>It keeps the blob, and can lend its read to {lendsTo}.</>
        )}
      </>
    ),
  });
}

function piece(
  data: Omit<FilePiece, 'caption'> & { before: ReactNode; after: ReactNode },
): FilePiece {
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
 * A photo as Marfa holds it: what can name its blob, the blob, and the stores
 * its copies live in. The rules are withmarfa/marfa's blobs chapter
 * (`blobs/lend-item`, `blobs/lend-edge`, `blobs/lend-extension`,
 * `blobs/lend-earlier-version`) and stores chapter (`stores/orphan-keeps-*`,
 * `stores/list-disk-always`, `stores/replicate-every-store`,
 * `stores/link-store-once-held`).
 */
export const pieces: readonly FilePiece[] = [
  referrer({
    id: 'file',
    label: 'File item',
    icon: FileImage,
    summary: <code>blob_ref</code>,
    operation: { tag: 'Items', operationId: 'createItem', name: 'Create an item' },
    before: (
      <>
        A file is an item whose type inherits from <code>core.file</code>, and its{' '}
        <code>blob_ref</code> names the blob, in any state the item is in.
      </>
    ),
    verb: 'writes one',
    lendsTo: <>a credential that may read the item&apos;s type</>,
  }),
  referrer({
    id: 'edge',
    label: 'Edge',
    icon: Waypoints,
    summary: 'In its properties',
    operation: { tag: 'Edges', operationId: 'createEdge', name: 'Create an edge' },
    before: "An edge's properties can name a blob too.",
    verb: 'writes one',
    lendsTo: <>a credential that may read the edge&apos;s type and its source item&apos;s type</>,
  }),
  referrer({
    id: 'extension',
    label: 'Extension',
    icon: Puzzle,
    summary: 'In a namespace',
    operation: {
      tag: 'Extensions',
      operationId: 'replaceItemExtension',
      name: 'Replace an extension namespace',
    },
    before: 'An extension namespace can name a blob.',
    verb: 'writes one',
    lendsTo: <>a working key that may read the namespace and the item&apos;s type</>,
  }),
  referrer({
    id: 'version',
    label: 'Earlier version',
    icon: History,
    summary: 'In the history',
    operation: { tag: 'Items', operationId: 'listItemVersions', name: 'List item versions' },
    before: 'A snapshot of an item that named the blob before a later write took it out.',
    verb: 'reads it',
    lendsTo: null,
  }),
  piece({
    id: 'blob',
    tier: 'blob',
    label: 'Blob',
    icon: Shapes,
    summary: 'Bytes, by their hash',
    operation: { tag: 'Blobs', operationId: 'uploadBlob', name: 'Upload a blob' },
    before: 'The bytes, stored once under their SHA-256 hash, with their size and the media type of their first upload.',
    after: 'stores them, and the same bytes uploaded again answer the same hash.',
  }),
  piece({
    id: 'disk',
    tier: 'store',
    label: 'Disk',
    icon: HardDrive,
    summary: 'Gets every upload',
    operation: { tag: 'Blobs', operationId: 'listBlobStores', name: 'List blob stores' },
    before: 'The directory beside the server, which every instance has.',
    after: 'lists it beside any other store, and every upload is written to it.',
  }),
  piece({
    id: 'object-store',
    tier: 'store',
    label: 'Object store',
    icon: Cloud,
    summary: 'Optional bucket',
    operation: { tag: 'Blobs', operationId: 'getBlobUrl', name: 'Get a blob URL' },
    before: (
      <>
        A bucket the instance is configured with. The <code>blob-replicate</code> housekeeping job
        copies every blob to it, and
      </>
    ),
    after: 'answers a link from the bucket once it holds the blob.',
  }),
];

const byTier = (tier: Tier) => pieces.filter((p) => p.tier === tier);
const referrers = byTier('referrer');
const blob = byTier('blob')[0];
const stores = byTier('store');
const byId = new Map(pieces.map((p) => [p.id, p]));

/**
 * Three tiers joined by two wires: what can name the blob, in a group on
 * top; the blob in the middle; and the stores that hold its copies, in a
 * group below. Selecting a referrer lights the upper wire and the blob,
 * and says whether it keeps the blob and lends its read. Selecting a store
 * lights the lower wire and the blob.
 */
export function FileMap() {
  return (
    <Diagram
      label="Where a file's bytes live"
      nodes={pieces}
      idleCaption="Select a piece to see what keeps a blob, who may read it through what, and where its copies live."
    >
      {({ selected, stateOf, toggle }) => {
        const current = selected === null ? undefined : byId.get(selected);
        const lit = (tier: Tier): DiagramState =>
          current === undefined ? 'idle' : current.tier === tier || current.tier === 'blob' ? 'on' : 'off';
        const blobState: DiagramState = current === undefined ? 'idle' : 'on';
        const box = (p: FilePiece) => (
          <DiagramBox key={p.id} node={p} state={stateOf(p.id)} onSelect={() => toggle(p.id)} />
        );
        return (
          <div className="marfa-fm">
            <div className="marfa-fm-group">
              <div className="marfa-fm-group-title">Names its hash</div>
              <div className="marfa-fm-grid">{referrers.map(box)}</div>
            </div>
            <DiagramWire className="marfa-fm-wire" state={lit('referrer')} />
            <DiagramBox
              className="marfa-fm-blob"
              node={blob}
              state={selected === blob.id ? 'on' : blobState}
              onSelect={() => toggle(blob.id)}
            />
            <DiagramWire className="marfa-fm-wire" state={lit('store')} />
            <div className="marfa-fm-group">
              <div className="marfa-fm-group-title">Holds a copy</div>
              <div className="marfa-fm-grid">{stores.map(box)}</div>
            </div>
          </div>
        );
      }}
    </Diagram>
  );
}
