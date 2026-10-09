import Link from 'fumadocs-core/link';
import { FolderOpen, ListOrdered, Server, Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';
import { operationHref, type Operation } from './item-layers';

/** Which row of the picture a piece sits in. */
export type Row = 'instance' | 'device' | 'directory';

export type DevicePiece = DiagramNode & {
  row: Row;
  /** The operations the caption links to, in the order it names them. */
  operations: readonly Operation[];
};

const listItems: Operation = { tag: 'Items', operationId: 'listItems', name: 'List items' };
const streamEvents: Operation = {
  tag: 'Event stream',
  operationId: 'streamEvents',
  name: 'Stream change events',
};
const updateItem: Operation = { tag: 'Items', operationId: 'updateItem', name: 'Update an item' };
const createFolder: Operation = { tag: 'Folders', operationId: 'createFolder', name: 'Create a folder' };
const updateFolder: Operation = { tag: 'Folders', operationId: 'updateFolder', name: 'Update a folder' };

function link(operation: Operation): ReactNode {
  return (
    <Link href={operationHref(operation)} className="marfa-diagram-caption-link">
      {operation.name}
    </Link>
  );
}

/**
 * A device and what it talks to. The rules are withmarfa/marfa's device
 * chapter (`device/hydrate-listing`, `device/catch-up-resumes`,
 * `device/follow-applies`, `device/slice-held`), queue chapter
 * (`queue-and-verdicts/queue-sends-in-order`,
 * `queue-and-verdicts/verdicts-six`) and folders chapter
 * (`folders/settings-send`, `folders/item-to-file`, `folders/file-to-item`).
 */
export const pieces: readonly DevicePiece[] = [
  {
    id: 'instance',
    row: 'instance',
    label: 'Instance',
    icon: Server,
    summary: 'The truth',
    operations: [listItems, streamEvents, updateItem],
    caption: (
      <>
        The instance holds the truth. A device reads its items with {link(listItems)} to hydrate,
        follows {link(streamEvents)} to catch up, and sends each queued write to the operation that
        makes it, such as {link(updateItem)}.
      </>
    ),
  },
  {
    id: 'copy',
    row: 'device',
    label: 'Working copy',
    icon: Layers,
    summary: 'One slice',
    operations: [],
    caption:
      'The working copy holds the slice the device declared: the types, the tier and the edge types it keeps whole. Every read answers from it, offline too.',
  },
  {
    id: 'queue',
    row: 'device',
    label: 'Queue',
    icon: ListOrdered,
    summary: 'Unanswered writes',
    operations: [],
    caption:
      'A write shows in the working copy at once and waits in the queue. A drain sends the queue in order, and the instance answers each write with a verdict.',
  },
  {
    id: 'directory',
    row: 'directory',
    label: 'Directory',
    icon: FolderOpen,
    summary: 'Files, on a Mac',
    operations: [createFolder, updateFolder],
    caption: (
      <>
        A folder writes the copy&apos;s items into a directory as files and reads edits back as queued
        writes. {link(createFolder)} makes the settings it follows, and {link(updateFolder)} changes
        them for every machine bound to the folder.
      </>
    ),
  },
];

const byRow = (row: Row) => pieces.filter((p) => p.row === row);
const byId = new Map(pieces.map((p) => [p.id, p]));

/**
 * Three rows joined by two wires: the instance on top, the device's working
 * copy and queue in a group, and a folder's directory below. Selecting a
 * piece lights the wires it uses: the instance only the upper one, the
 * directory only the lower one, and the copy and the queue both.
 */
export function DeviceMap() {
  return (
    <Diagram
      label="A device and the instance it follows"
      nodes={pieces}
      idleCaption="Select a piece to see what it holds and which operations reach it."
    >
      {({ selected, stateOf, toggle }) => {
        const current = selected === null ? undefined : byId.get(selected);
        const lit = (...rows: Row[]): DiagramState =>
          current === undefined ? 'idle' : current.row === 'device' || rows.includes(current.row) ? 'on' : 'off';
        const box = (p: DevicePiece) => (
          <DiagramBox key={p.id} node={p} state={stateOf(p.id)} onSelect={() => toggle(p.id)} />
        );
        const [instance] = byRow('instance');
        const [directory] = byRow('directory');
        return (
          <div className="marfa-dm">
            <DiagramBox
              className="marfa-dm-single"
              node={instance}
              state={stateOf(instance.id)}
              onSelect={() => toggle(instance.id)}
            />
            <DiagramWire className="marfa-dm-wire" state={lit('instance')} />
            <div className="marfa-dm-group">
              <div className="marfa-dm-group-title">The device</div>
              <div className="marfa-dm-grid">{byRow('device').map(box)}</div>
            </div>
            <DiagramWire className="marfa-dm-wire" state={lit('directory')} />
            <DiagramBox
              className="marfa-dm-single"
              node={directory}
              state={stateOf(directory.id)}
              onSelect={() => toggle(directory.id)}
            />
          </div>
        );
      }}
    </Diagram>
  );
}
