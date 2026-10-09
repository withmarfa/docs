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

type Side = 'left' | 'right';

const spokes: readonly (DiagramNode & { side: Side })[] = [
  {
    id: 'apps',
    side: 'left',
    label: 'Apps',
    icon: AppWindow,
    summary: 'Read and write data',
    caption:
      'Apps read and write over the HTTP API with a credential, and see only the types their credential reaches.',
  },
  {
    id: 'connectors',
    side: 'left',
    label: 'Connectors',
    icon: Cable,
    summary: 'Records in and out',
    caption:
      'Connectors run outside the server, register with the instance, and bring records in or send them out over the API, reporting each run.',
  },
  {
    id: 'devices',
    side: 'right',
    label: 'Devices',
    icon: Laptop,
    summary: 'A local working copy',
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
        <code>marfa</code> command
      </>
    ),
    icon: SquareTerminal,
    summary: 'Run any operation',
    caption: (
      <>
        The <code>marfa</code> command is the reference client: every published API operation is a
        command, and it is a device too.
      </>
    ),
  },
];

const cloud: DiagramNode = {
  id: 'cloud',
  label: 'Marfa Cloud',
  icon: Cloud,
  summary: 'A public address, no data',
  caption:
    'Coming soon: Marfa Cloud puts a ready-made public address in front of your instance and holds none of your data.',
  planned: { tag: 'Coming soon' },
};

const nodes: readonly DiagramNode[] = [...spokes, cloud];

const contents: readonly { label: string; icon: LucideIcon }[] = [
  { label: 'Items', icon: Box },
  { label: 'Types', icon: Shapes },
  { label: 'Edges', icon: Waypoints },
  { label: 'Files', icon: File },
];

/**
 * Your instance in the middle, Marfa Cloud as a dashed layer around it, and
 * the pieces that reach it.
 *
 * Wide, the pieces sit on either side of the instance, each with its own wire.
 * Narrow, they stack under it on one rail, so a piece's path runs down the
 * rail past the pieces above it: those segments light too.
 */
export function InstanceMap() {
  return (
    <Diagram
      label="What works with your instance"
      nodes={nodes}
      idleCaption="Select a piece to see how it reaches your instance."
    >
      {({ selected, stateOf, toggle }) => {
        const selectedIndex = spokes.findIndex((spoke) => spoke.id === selected);
        const CloudIcon = cloud.icon;

        return (
          <div className="marfa-im">
            {/* Like a DiagramBox, the layer is not a focus stop: its chip is. */}
            <div
              className="marfa-im-cloud"
              data-state={stateOf(cloud.id)}
              onClick={() => toggle(cloud.id)}
            >
              <div className="marfa-im-cloud-head">
                <div className="marfa-diagram-box-title">
                  <CloudIcon aria-hidden="true" />
                  <span>{cloud.label}</span>
                </div>
                <span className="marfa-diagram-tag">{cloud.planned?.tag}</span>
              </div>
              <div className="marfa-diagram-box-summary">{cloud.summary}</div>

              {/* A click on the instance is not a click on the layer around it. */}
              <div
                className="marfa-im-hub"
                data-state={selected === null ? 'idle' : 'on'}
                onClick={(event) => event.stopPropagation()}
              >
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
            </div>

            {spokes.map((spoke, index) => {
              const state = stateOf(spoke.id);
              const passing: DiagramState =
                selectedIndex === -1 ? 'idle' : index < selectedIndex ? 'on' : 'off';
              const leadIn: DiagramState =
                selectedIndex === -1 ? 'idle' : index <= selectedIndex ? 'on' : 'off';

              return (
                <div
                  key={spoke.id}
                  className="marfa-im-spoke"
                  data-side={spoke.side}
                  data-area={spoke.id}
                >
                  <DiagramWire className="marfa-im-wire" state={state} />
                  <DiagramWire className="marfa-im-rail-in" state={leadIn} />
                  <DiagramWire className="marfa-im-rail-through" state={passing} />
                  <DiagramBox node={spoke} state={state} onSelect={() => toggle(spoke.id)} />
                </div>
              );
            })}
          </div>
        );
      }}
    </Diagram>
  );
}
