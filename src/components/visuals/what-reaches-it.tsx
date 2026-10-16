import { Cpu, Database, Globe, Monitor, Package, Terminal, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, Box, Branches, Chip, Figure, Flow, Group } from './figure';

type Layer = { title: string; subtitle: string; icon: LucideIcon };

/**
 * What a native client is built on, top to bottom: the Swift SDK or the CLI,
 * over the Rust core that sends their requests and can keep a working copy.
 */
export const native: { clients: readonly Layer[]; core: Layer } = {
  clients: [
    { title: 'Swift SDK', subtitle: 'In an iPhone or Mac app', icon: Monitor },
    { title: 'CLI', subtitle: 'For agents, scripts and the terminal', icon: Terminal },
  ],
  core: { title: 'Rust core', subtitle: 'Sends requests, and can keep a working copy', icon: Cpu },
};

/** An online client sends each request itself, usually through the TypeScript SDK. */
export const online: Layer = { title: 'TypeScript SDK', subtitle: 'In connectors, scripts and apps', icon: Package };

/** Where every request arrives, and what the instance keeps its data in. */
export const api: Layer = { title: 'HTTP API', subtitle: 'Every request carries a credential', icon: Globe };
export const keeps = ['One SQLite database', 'A folder of files'] as const;

/**
 * Everything that reaches an instance, drawn as the layers a request passes
 * through: a native client's SDK or the CLI over the Rust core, or an online
 * client's TypeScript SDK, then the HTTP API, then the instance. After the
 * architecture drawing in withmarfa/marfa's README.
 */
export function WhatReachesIt({ caption }: { caption?: ReactNode }) {
  return (
    <Figure label="What reaches an instance: native and online clients, through the HTTP API" caption={caption} className="marfa-wr">
      <Branches
        rootAt="bottom"
        head="root"
        root={<Box className="marfa-wr-wide" icon={api.icon} title={api.title} subtitle={api.subtitle} />}
      >
        <Group label="Native clients" subtitle="Keep working offline">
          <Flow axis="down" align="stretch">
            {native.clients.map((layer) => (
              <Box key={layer.title} icon={layer.icon} title={layer.title} subtitle={layer.subtitle} />
            ))}
            <Arrow />
            <Box icon={native.core.icon} title={native.core.title} subtitle={native.core.subtitle} />
          </Flow>
        </Group>
        <Group label="Online clients" subtitle="Send each request straight to the API">
          <Flow axis="down" align="stretch">
            <Box icon={online.icon} title={online.title} subtitle={online.subtitle} />
          </Flow>
        </Group>
      </Branches>
      <Flow axis="down" className="marfa-wr-down">
        <Arrow />
        <Box className="marfa-wr-wide" tone="accent" icon={Database} title="Your instance" subtitle="The source of truth">
          {keeps.map((name) => (
            <Chip key={name}>{name}</Chip>
          ))}
        </Box>
      </Flow>
    </Figure>
  );
}
