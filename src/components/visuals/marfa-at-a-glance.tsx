import {
  Database,
  FolderSync,
  Globe,
  Plug,
  Smartphone,
  SquareTerminal,
  Bot,
  Code,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, Box, Branches, Chip, Figure, Flow, Group } from './figure';

type Thing = { title: string; subtitle?: string; icon: LucideIcon };

/** Examples of what one instance holds: one person's data, in shared types. */
export const holds = ['Notes', 'Tasks', 'Bookmarks', 'Files'] as const;

/**
 * The routes in, each named for the route and shown with a real example. The
 * first two keep a working copy on the device; the rest call the instance.
 */
export const routes: readonly { label: string; things: readonly Thing[] }[] = [
  {
    label: 'Keep a copy on the device',
    things: [
      { title: 'Swift SDK', subtitle: 'An iPhone app that works offline', icon: Smartphone },
      { title: 'Folder sync', subtitle: 'Markdown files on your Mac', icon: FolderSync },
    ],
  },
  {
    label: 'Call the instance',
    things: [
      { title: 'MCP server', subtitle: 'Claude, ChatGPT, Claude Code, Codex', icon: Bot },
      { title: 'CLI', subtitle: 'An agent that runs commands', icon: SquareTerminal },
      { title: 'HTTP API', subtitle: 'A script you wrote', icon: Code },
    ],
  },
];

/** Each connector and the service it reads, drawn below the instance. */
export const connectors: readonly (readonly [Thing, Thing])[] = [
  [
    { title: 'Todoist connector', subtitle: 'Tasks, both ways', icon: Plug },
    { title: 'Todoist', icon: Globe },
  ],
  [
    { title: 'GitHub connector', subtitle: 'Issues and pull requests', icon: Plug },
    { title: 'GitHub', icon: Globe },
  ],
];

/**
 * Marfa on one screen, drawn with real examples: one instance in the middle,
 * holding one person's data. The routes in reach it from above, grouped by
 * whether they keep a copy on the device; connectors reach it from below, each
 * joined to its service.
 */
export function MarfaAtAGlance({ caption }: { caption?: ReactNode }) {
  return (
    <Figure
      label="Marfa at a glance: the Swift SDK, folder sync, the MCP server, the CLI and the HTTP API above one instance, and the Todoist and GitHub connectors below it"
      caption={caption}
      className="marfa-glance"
    >
      <Branches
        rootAt="bottom"
        root={
          <Box tone="accent" icon={Database} title="Your instance" subtitle="On your Mac, or a host you choose">
            {holds.map((name) => (
              <Chip key={name}>{name}</Chip>
            ))}
          </Box>
        }
      >
        {routes.map((route) => (
          <Group key={route.label} label={route.label}>
            {route.things.map((thing) => (
              <Box key={thing.title} icon={thing.icon} title={thing.title} subtitle={thing.subtitle} />
            ))}
          </Group>
        ))}
      </Branches>
      <Branches className="marfa-glance-outside">
        {connectors.map(([connector, service]) => (
          <Flow key={connector.title} axis="down">
            <Box icon={connector.icon} title={connector.title} subtitle={connector.subtitle} />
            <Arrow direction="none" />
            <Box tone="dashed" icon={service.icon} title={service.title} />
          </Flow>
        ))}
      </Branches>
    </Figure>
  );
}
