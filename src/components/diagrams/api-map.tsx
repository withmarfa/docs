import Link from 'fumadocs-core/link';
import {
  ArchiveRestore,
  Box,
  Cable,
  File,
  Folder,
  KeyRound,
  Layers,
  Puzzle,
  Radio,
  Search,
  Server,
  Shapes,
  Spline,
  Tags,
  Waypoints,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { docsRoute } from '@/lib/shared';
// A named import, so the bundle carries the tags and not the whole description.
import { tags } from '../../../openapi.json';
import { Diagram, DiagramBox, type DiagramNode } from './diagram';

export type ApiGroup = {
  /** The tag's name in the API description. */
  tag: string;
  icon: LucideIcon;
  /** A few words, on one line at every width. */
  summary: string;
  /**
   * The `operationId` the group's link opens: the group's first operation in
   * the API description, which a test holds it to. It is written here rather
   * than looked up because the paths would put the whole description in the
   * page's bundle.
   */
  start: string;
};

export type ApiCluster = {
  id: string;
  label: string;
  groups: readonly ApiGroup[];
};

/** Every tag in the API description, in its order, gathered by what it is for. */
export const clusters: readonly ApiCluster[] = [
  {
    id: 'data',
    label: 'Your data',
    groups: [
      { tag: 'Items', icon: Box, summary: 'Typed records', start: 'createItem' },
      { tag: 'Bulk actions', icon: Layers, summary: 'Change many at once', start: 'applyBulkAction' },
      { tag: 'Metadata', icon: Tags, summary: 'Tags on items', start: 'getItemMetadata' },
      { tag: 'Extensions', icon: Puzzle, summary: 'JSON by namespace', start: 'listItemExtensions' },
      { tag: 'Edges', icon: Waypoints, summary: 'Directed relationships', start: 'listItemEdges' },
    ],
  },
  {
    id: 'shape',
    label: 'The shape of your data',
    groups: [
      { tag: 'Types', icon: Shapes, summary: 'What items can be', start: 'listTypes' },
      { tag: 'Edge types', icon: Spline, summary: 'What edges can be', start: 'registerEdgeType' },
    ],
  },
  {
    id: 'files',
    label: 'Files',
    groups: [
      { tag: 'Blobs', icon: File, summary: 'Bytes by hash', start: 'uploadBlob' },
      { tag: 'Folders', icon: Folder, summary: 'Folder settings', start: 'createFolder' },
    ],
  },
  {
    id: 'changes',
    label: 'Finding and following changes',
    groups: [
      { tag: 'Search', icon: Search, summary: 'Full-text search', start: 'searchItems' },
      { tag: 'Event stream', icon: Radio, summary: 'Changes as they happen', start: 'streamEvents' },
      { tag: 'Webhooks', icon: Webhook, summary: 'Changes sent to a URL', start: 'createWebhook' },
    ],
  },
  {
    id: 'instance',
    label: 'Running your instance',
    groups: [
      { tag: 'Connectors', icon: Cable, summary: 'Run outside the server', start: 'registerConnector' },
      { tag: 'Access', icon: KeyRound, summary: 'Keys and the owner', start: 'createKey' },
      { tag: 'Instance', icon: Server, summary: 'Config, jobs, audit', start: 'listHousekeeping' },
      { tag: 'Export and restore', icon: ArchiveRestore, summary: 'Archives of your data', start: 'restoreArchive' },
    ],
  },
];

/** The folder fumadocs-openapi gives a tag: its default slugify. */
export function groupSlug(tag: string): string {
  return tag.replace(/\s+/g, '-').toLowerCase();
}

export function groupHref(group: ApiGroup): string {
  return `${docsRoute}/api-reference/${groupSlug(group.tag)}/${group.start}`;
}

/** Inline code in a tag description, the one Markdown it uses. */
function inline(text: string): ReactNode {
  return text
    .split('`')
    .map((part, index) =>
      index % 2 === 1 ? <code key={index}>{part}</code> : <Fragment key={index}>{part}</Fragment>,
    );
}

const descriptions = new Map(tags.map((tag) => [tag.name, tag.description]));

function toNode(group: ApiGroup): DiagramNode {
  return {
    id: groupSlug(group.tag),
    label: group.tag,
    icon: group.icon,
    summary: group.summary,
    caption: (
      <>
        {inline(descriptions.get(group.tag) ?? '')}{' '}
        <Link href={groupHref(group)} className="marfa-diagram-caption-link">
          See the {group.tag} operations
        </Link>
      </>
    ),
  };
}

const groups = clusters.flatMap((cluster) =>
  cluster.groups.map((group) => ({ group, node: toNode(group) })),
);
const nodes: readonly DiagramNode[] = groups.map(({ node }) => node);
const nodeOf = new Map(groups.map(({ group, node }) => [group, node]));

/**
 * The API reference's groups, one per tag, gathered into clusters by what
 * they are for. Each group's name links to its operations, and selecting a
 * group shows its description from the API description.
 */
export function ApiMap() {
  return (
    <Diagram
      label="The groups of operations in the API"
      nodes={nodes}
      idleCaption="Select a group to see what it holds. Each group's name opens its operations."
    >
      {({ stateOf, toggle }) => (
        <div className="marfa-am">
          {clusters.map((cluster) => (
            <section key={cluster.id} className="marfa-am-cluster" aria-label={cluster.label}>
              <div className="marfa-am-cluster-title">{cluster.label}</div>
              <div className="marfa-am-groups">
                {cluster.groups.map((group) => {
                  const node = nodeOf.get(group)!;
                  return (
                    <DiagramBox
                      key={node.id}
                      className="marfa-am-group"
                      node={node}
                      state={stateOf(node.id)}
                      onSelect={() => toggle(node.id)}
                      href={groupHref(group)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Diagram>
  );
}
