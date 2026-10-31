import type { ReactNode } from 'react';
import { Box, Figure } from './figure';

export type TreeNode = {
  id: string;
  /** The types whose `parent` is this one. */
  children?: readonly TreeNode[];
  /** A type that names the listing's type in `compatible_with`, so the listing leaves it out. */
  left?: boolean;
};

/**
 * Two listings, each with the types it returns. A listing of a type returns
 * every type whose chain of `parent` reaches it (`types/listing-subtree`),
 * and not a type that only names it in `compatible_with`.
 */
export const listings: readonly { title: string; nodes: readonly TreeNode[] }[] = [
  {
    title: 'List files',
    nodes: [{ id: 'core.file', children: [{ id: 'core.file.image', children: [{ id: 'app.example.receipt' }] }] }],
  },
  {
    title: 'List notes',
    nodes: [{ id: 'core.note' }, { id: 'user.recipe', left: true }],
  },
];

/**
 * A type, with the types beneath it in a list nested in its own, so a screen
 * reader hears each one's depth. Safari drops the list semantics of a list
 * drawn without markers, so each list names its role. A type the listing
 * returns is marked with the accent; one it leaves out is dashed.
 */
function Node({ node }: { node: TreeNode }): ReactNode {
  return (
    <li>
      <span className="marfa-ti-node" data-returned={!node.left || undefined} data-left={node.left || undefined}>
        <code>{node.id}</code>
        {node.left ? <span className="marfa-ti-note">Compatible, not returned</span> : null}
      </span>
      {node.children?.length ? (
        <ul role="list">
          {node.children.map((child) => (
            <Node key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Two small trees side by side: what listing files returns, the type and
 * every type beneath it, and what listing notes returns, which leaves out a
 * type that is only compatible with notes.
 */
export function TypeInheritance({ caption }: { caption?: ReactNode }) {
  return (
    <Figure label="Which types a listing of a type returns" caption={caption} className="marfa-ti">
      {listings.map((listing) => (
        <Box key={listing.title} title={listing.title}>
          <ul className="marfa-ti-tree" role="list">
            {listing.nodes.map((node) => (
              <Node key={node.id} node={node} />
            ))}
          </ul>
        </Box>
      ))}
    </Figure>
  );
}
