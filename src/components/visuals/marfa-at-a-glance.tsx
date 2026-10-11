import { AppWindow, Database, Globe, Laptop, Plug, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, Box, Branches, Chip, Figure, Flow } from './figure';

type Thing = { title: string; subtitle: string; icon: LucideIcon };

/** What one instance holds, by the glossary's names. A file is an item; its bytes are a blob. */
export const holds = ['Items', 'Types', 'Edges', 'Blobs'] as const;

/** The things of your own that reach the instance, drawn above it. */
export const yours: readonly Thing[] = [
  { title: 'Apps and scripts', subtitle: 'Read and write over the HTTP API', icon: AppWindow },
  { title: 'Devices', subtitle: 'Keep a working copy, even offline', icon: Laptop },
];

/** What reaches the instance from outside, drawn below it, in order of distance. */
export const outside: readonly [Thing, Thing] = [
  { title: 'Connectors', subtitle: 'Read and write on your behalf', icon: Plug },
  { title: 'Other services', subtitle: 'Where the connectors reach', icon: Globe },
];

/**
 * The whole of Marfa on one screen: one instance in the middle, holding one
 * owner's data. Your own apps and devices reach it from above; connectors
 * reach it from below, and other services lie beyond them.
 */
export function MarfaAtAGlance({ caption }: { caption?: ReactNode }) {
  const [connectors, services] = outside;
  return (
    <Figure label="Marfa at a glance: one instance and what reaches it" caption={caption} className="marfa-glance">
      <Branches
        rootAt="bottom"
        root={
          <Box tone="accent" icon={Database} title="Your instance" subtitle="Belongs to one owner">
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
        <Box icon={connectors.icon} title={connectors.title} subtitle={connectors.subtitle} />
        <Arrow direction="none" />
        <Box tone="dashed" icon={services.icon} title={services.title} subtitle={services.subtitle} />
      </Flow>
    </Figure>
  );
}
