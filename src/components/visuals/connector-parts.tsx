import {
  ClipboardList,
  Database,
  FileBraces,
  Handshake,
  Inbox,
  ListChecks,
  Lock,
  Plug,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, ArrowHead, Box, Figure, Flow } from './figure';


export type Kept = { name: string; icon: LucideIcon };

/**
 * What the instance keeps for one connector, by the contract's names: the
 * registration and its runs, the hold on it, and, under the connector's
 * source, the state document, the agreements and the items it writes.
 */
export const kept: readonly Kept[] = [
  { name: 'Registration and runs', icon: ClipboardList },
  { name: 'Hold', icon: Lock },
  { name: 'State document', icon: FileBraces },
  { name: 'Agreements', icon: Handshake },
  { name: 'Items under its source', icon: Inbox },
];

/**
 * A connector between its vendor and the instance. It talks to both, with the
 * vendor's API on one side and a key of its own on the other; the vendor can
 * also post to a webhook endpoint on the instance, which keeps each delivery
 * for the connector to read.
 */
export function ConnectorParts({ caption }: { caption?: ReactNode }) {
  return (
    <Figure label="A connector between its vendor and your instance" caption={caption} className="marfa-cp">
      <div className="marfa-cp-grid">
        <div className="marfa-cp-frame" aria-hidden="true" />
        <Box className="marfa-cp-vendor" icon={ListChecks} title="Todoist" subtitle="The vendor" />
        <Flow className="marfa-cp-link marfa-cp-link-vendor">
          <Arrow direction="both" label="its API" />
        </Flow>
        <Box className="marfa-cp-connector" icon={Plug} title="Your connector" subtitle="Runs where you choose" />
        <Flow className="marfa-cp-link marfa-cp-link-instance">
          <Arrow direction="both" label="its own key" />
        </Flow>
        <div className="marfa-cp-kept">
          <div className="marfa-fig-group-label">
            <Database aria-hidden="true" />
            <span>Your instance</span>
          </div>
          <div className="marfa-cp-kept-label">Keeps for the connector</div>
          <ul className="marfa-cp-kept-list">
            {kept.map((thing) => {
              const Icon = thing.icon;
              return (
                <li key={thing.name}>
                  <Icon aria-hidden="true" />
                  {thing.name}
                </li>
              );
            })}
          </ul>
        </div>
        <Box className="marfa-cp-endpoint" icon={Webhook} title="Webhook endpoint" subtitle="Keeps each delivery" />
        {/* Vendor to endpoint, past the connector: down from the vendor, a turn, then a run to the endpoint. */}
        <span className="marfa-cp-bypass marfa-cp-bypass-start" aria-hidden="true" />
        <span className="marfa-cp-bypass marfa-cp-bypass-run" aria-hidden="true">
          <span className="marfa-cp-bypass-label">posts inbound webhooks</span>
          <ArrowHead />
        </span>
        <span className="marfa-cp-bypass marfa-cp-bypass-turn" aria-hidden="true">
          <ArrowHead />
        </span>
      </div>
    </Figure>
  );
}
