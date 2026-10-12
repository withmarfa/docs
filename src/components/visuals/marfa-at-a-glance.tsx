import { Bot, Database, Globe, Plug, Smartphone, SquareTerminal, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, Box, Branches, Chip, Figure, Flow } from './figure';

type Thing = { title: string; subtitle: string; icon: LucideIcon };

/** Examples of what one instance holds: one person's data, in shared types. */
export const holds = ['Notes', 'Tasks', 'Bookmarks', 'Files'] as const;

/** Real examples of what reaches the instance from your own devices, drawn above it. */
export const yours: readonly Thing[] = [
  { title: 'A notes app', subtitle: 'On your iPhone, works offline', icon: Smartphone },
  { title: 'An AI agent', subtitle: 'Uses the CLI with its own key', icon: Bot },
  { title: 'A script you wrote', subtitle: 'Calls the HTTP API', icon: SquareTerminal },
];

/** A connector and the service it reads, drawn below the instance. */
export const outside: readonly [Thing, Thing] = [
  { title: 'A Todoist connector', subtitle: 'Runs where you choose', icon: Plug },
  { title: 'Todoist', subtitle: 'Where your tasks started', icon: Globe },
];

/**
 * Marfa on one screen, drawn with real examples: one instance in the middle,
 * holding one person's data. Your own apps, agents and scripts reach it from
 * above; a connector reaches it from below, bringing in a service's records.
 */
export function MarfaAtAGlance({ caption }: { caption?: ReactNode }) {
  const [connector, service] = outside;
  return (
    <Figure
      label="Marfa at a glance: your apps, agents and scripts above one instance, and a connector below it"
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
        {yours.map((thing) => (
          <Box key={thing.title} icon={thing.icon} title={thing.title} subtitle={thing.subtitle} />
        ))}
      </Branches>
      <Flow axis="down" className="marfa-glance-outside">
        <Arrow direction="none" />
        <Box icon={connector.icon} title={connector.title} subtitle={connector.subtitle} />
        <Arrow direction="none" />
        <Box tone="dashed" icon={service.icon} title={service.title} subtitle={service.subtitle} />
      </Flow>
    </Figure>
  );
}
