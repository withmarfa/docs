import Link from 'fumadocs-core/link';
import type { CSSProperties, ReactNode } from 'react';
import { AppWindow, Fingerprint, KeyRound, KeySquare, Smartphone } from 'lucide-react';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';
import { operationHref, type Operation } from './item-layers';

export type AccessNode = DiagramNode & {
  /** The node this one comes from: who minted the key, or approved the app. */
  parent?: string;
  /** The operation the caption links to. */
  operation: Operation;
};

const createKey: Operation = { tag: 'Access', operationId: 'createKey', name: 'Create an API key' };

function node(
  data: Omit<AccessNode, 'caption'> & { text: ReactNode; made: string },
): AccessNode {
  const { text, made, ...rest } = data;
  return {
    ...rest,
    caption: (
      <>
        {text} {made}{' '}
        <Link href={operationHref(data.operation)} className="marfa-diagram-caption-link">
          {data.operation.name}
        </Link>
        .
      </>
    ),
  };
}

/**
 * Who can hand access to whom, parent first. A key or an app comes from the
 * node above it, and holds no more than that node does
 * (`keys-and-oauth/mint-ceiling` and `keys-and-oauth/app-mint-ceiling` in
 * withmarfa/marfa).
 */
export const nodes: readonly AccessNode[] = [
  node({
    id: 'owner',
    label: 'Owner',
    icon: Fingerprint,
    summary: 'Direct authority',
    operation: { tag: 'Access', operationId: 'createOwner', name: 'Claim the instance' },
    text: (
      <>
        The owner signs in to the instance in the browser, or runs a command through its private
        socket, and has direct authority to manage the instance: mint keys, approve apps and run
        maintenance. It reads and writes no items, so the owner mints a key for that.
      </>
    ),
    made: 'One claim, with a setup code, makes the owner:',
  }),
  node({
    id: 'key',
    label: 'Key',
    parent: 'owner',
    icon: KeyRound,
    summary: 'Maps and permissions',
    operation: createKey,
    text: (
      <>
        A key holds what it was minted with: up to twelve permissions, five maps that decide the
        content it reads and writes, and the sources it writes under. The owner can give it
        anything.
      </>
    ),
    made: 'Minted with',
  }),
  node({
    id: 'narrower',
    label: 'Narrower key',
    parent: 'key',
    icon: KeySquare,
    summary: 'Within its minter',
    operation: createKey,
    text: (
      <>
        A key that holds <code>keys.mint</code> can mint another, and the new key can't hold
        anything its minter doesn't. Asking for more is refused with <code>403 forbidden</code>.
      </>
    ),
    made: 'Minted with',
  }),
  node({
    id: 'app',
    label: 'App',
    parent: 'owner',
    icon: AppWindow,
    summary: 'A grant of scopes',
    operation: { tag: 'Access', operationId: 'registerOAuthClient', name: 'Register an OAuth client' },
    text: (
      <>
        An app is a program the owner signs in through OAuth. Its access token holds only the scopes
        the owner consented to, which is its grant, and ends when the owner revokes the grant.
      </>
    ),
    made: 'Any program registers itself with',
  }),
  node({
    id: 'app-key',
    label: "App's key",
    parent: 'app',
    icon: Smartphone,
    summary: 'Within the grant',
    operation: createKey,
    text: (
      <>
        An app whose grant includes <code>keys.mint</code> can mint a key within that grant. The key
        carries the app&apos;s <code>oauth_client_id</code> and can be narrowed, never widened.
      </>
    ),
    made: 'Minted with',
  }),
];

const byId = new Map(nodes.map((n) => [n.id, n]));

function depthOf(n: AccessNode): number {
  let depth = 0;
  for (let at = n.parent; at; at = byId.get(at)?.parent) depth++;
  return depth;
}

/** The node and every node above it. */
function chainOf(id: string): Set<string> {
  const chain = new Set<string>();
  for (let at: string | undefined = id; at; at = byId.get(at)?.parent) chain.add(at);
  return chain;
}

/**
 * The node's next sibling: the node under the same parent that follows its
 * whole subtree in the list.
 */
function nextSibling(n: AccessNode): AccessNode | undefined {
  const start = nodes.indexOf(n);
  for (let i = start + 1; i < nodes.length; i++) {
    const depth = depthOf(nodes[i]);
    if (depth < depthOf(n)) return undefined;
    if (depth === depthOf(n)) return nodes[i];
  }
  return undefined;
}

/** The ancestor-or-self of `n` at the given depth. */
function atDepth(n: AccessNode, depth: number): AccessNode {
  let at = n;
  while (depthOf(at) > depth) at = byId.get(at.parent!)!;
  return at;
}

/**
 * The owner, the keys it mints and the apps it approves, as one tree. Selecting
 * a node lights it and the nodes above it, and says what it holds and which
 * operation makes it.
 *
 * Each child sits one step in from the node above it, joined by an elbow. A
 * node with a later sibling has a rail that runs down past its own subtree to
 * that sibling's elbow, so every line reaches the node it belongs to.
 */
export function AccessTree() {
  return (
    <Diagram
      label="Who can hand access to whom"
      nodes={nodes}
      idleCaption="Select a piece to see what it holds, and what it can hand on."
    >
      {({ selected, toggle }) => {
        const chain = selected === null ? null : chainOf(selected);
        const stateOf = (id: string): DiagramState =>
          chain === null ? 'idle' : chain.has(id) ? 'on' : 'off';

        return (
          <ul className="marfa-ac">
            {nodes.map((n) => {
              const depth = depthOf(n);
              const state = stateOf(n.id);
              // A rail at each level above this row, drawn for the sibling it
              // leads to: the one that comes after the ancestor at that level.
              const rails: { level: number; to: AccessNode; first: boolean }[] = [];
              for (let level = 0; level < depth; level++) {
                const branch = atDepth(n, level + 1);
                const to = nextSibling(branch);
                if (to) rails.push({ level, to, first: branch === n });
              }
              return (
                <li
                  key={n.id}
                  className="marfa-ac-row"
                  style={{ '--marfa-ac-depth': depth } as CSSProperties}
                >
                  {rails.map(({ level, to, first }) => (
                    <DiagramWire
                      key={level}
                      className={`marfa-ac-rail marfa-ac-level-${level}${first ? ' marfa-ac-rail-first' : ''}`}
                      state={stateOf(to.id)}
                    />
                  ))}
                  {n.parent ? (
                    <DiagramWire className={`marfa-ac-elbow marfa-ac-level-${depth - 1}`} state={state} />
                  ) : null}
                  <DiagramBox
                    className="marfa-ac-box"
                    node={n}
                    state={state}
                    onSelect={() => toggle(n.id)}
                  />
                </li>
              );
            })}
          </ul>
        );
      }}
    </Diagram>
  );
}
