import {
  AppWindow,
  Box,
  Cable,
  Cloud,
  File,
  Laptop,
  Shapes,
  SquareTerminal,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';

type Side = 'left' | 'right' | 'bottom';

const nodes: readonly (DiagramNode & { side: Side })[] = [
  {
    id: 'apps',
    side: 'left',
    label: 'Apps',
    icon: AppWindow,
    summary: 'Read and write over the API',
    caption:
      'Apps read and write over the HTTP API with a credential, and see only the types their permissions reach.',
  },
  {
    id: 'connectors',
    side: 'left',
    label: 'Connectors',
    icon: Cable,
    summary: 'Bring records in, send them out',
    caption:
      'Connectors run outside the server and bring records in or send them out over the API, registering and reporting each run.',
  },
  {
    id: 'devices',
    side: 'right',
    label: 'Devices',
    icon: Laptop,
    summary: 'A working copy and a queue',
    caption: (
      <>
        A device keeps a working copy of part of the instance and a queue of writes through the
        core: an app on the Swift package or the Node module, the <code>marfa</code> command, or a
        folder of files.
      </>
    ),
  },
  {
    id: 'command',
    side: 'right',
    label: (
      <>
        The <code>marfa</code> command
      </>
    ),
    icon: SquareTerminal,
    summary: 'Every operation as a command',
    caption: (
      <>
        The <code>marfa</code> command is the reference client: every published API operation is a
        command, and it is a device too.
      </>
    ),
  },
  {
    id: 'cloud',
    side: 'bottom',
    label: 'Marfa Cloud',
    icon: Cloud,
    summary: 'A ready-made public address',
    caption:
      'Coming soon: Marfa Cloud gives your instance a ready-made public address, and holds none of your data.',
    planned: { tag: 'Coming soon' },
  },
];

const contents: readonly { label: string; icon: LucideIcon }[] = [
  { label: 'Items', icon: Box },
  { label: 'Types', icon: Shapes },
  { label: 'Edges', icon: Waypoints },
  { label: 'Files', icon: File },
];

/**
 * Your instance in the middle, and the pieces that reach it.
 *
 * Wide, the pieces sit on either side of the instance and below it, each with
 * its own wire. Narrow, they stack under it on one rail, so a piece's path
 * runs down the rail past the pieces above it: those segments light too.
 */
export function InstanceMap() {
  return (
    <Diagram
      label="What works with your instance"
      nodes={nodes}
      idleCaption="Select a piece to see how it reaches your instance."
    >
      {({ selected, stateOf, toggle }) => {
        const selectedIndex = nodes.findIndex((node) => node.id === selected);

        return (
          <div className="marfa-im">
            <div className="marfa-im-hub" data-state={selected === null ? 'idle' : 'on'}>
              <div className="marfa-im-hub-title">Your instance</div>
              <ul className="marfa-im-contents">
                {contents.map(({ label, icon: Icon }) => (
                  <li key={label}>
                    <Icon aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {nodes.map((node, index) => {
              const state = stateOf(node.id);
              const passing: DiagramState =
                selectedIndex === -1 ? 'idle' : index < selectedIndex ? 'on' : 'off';
              const leadIn: DiagramState =
                selectedIndex === -1 ? 'idle' : index <= selectedIndex ? 'on' : 'off';

              return (
                <div
                  key={node.id}
                  className="marfa-im-spoke"
                  data-side={node.side}
                  data-area={node.id}
                >
                  <DiagramWire
                    className="marfa-im-wire"
                    state={state}
                    planned={Boolean(node.planned)}
                  />
                  <DiagramWire className="marfa-im-rail-in" state={leadIn} />
                  <DiagramWire className="marfa-im-rail-through" state={passing} />
                  <DiagramBox node={node} state={state} onSelect={() => toggle(node.id)} />
                </div>
              );
            })}
          </div>
        );
      }}
    </Diagram>
  );
}
