import type { CSSProperties } from 'react';
import { AppWindow, Package, UserRound, type LucideIcon } from 'lucide-react';
import { Diagram, DiagramBox, DiagramWire, type DiagramNode, type DiagramState } from './diagram';

export type Namespace = 'core' | 'app' | 'user';

export type TypeNode = DiagramNode & {
  /** The type identifier, which is also the node's id. */
  id: string;
  namespace: Namespace;
  /**
   * The type this one hangs from in the drawing, and how: `parent` inherits
   * from it, `compatible` names it in `compatible_with` and inherits nothing.
   */
  from?: { id: string; by: 'parent' | 'compatible' };
  /** An identifier made up for the page rather than one Marfa ships. */
  example?: boolean;
};

const icons: Record<Namespace, LucideIcon> = {
  core: Package,
  app: AppWindow,
  user: UserRound,
};

function typeNode(node: Omit<TypeNode, 'icon' | 'label'>): TypeNode {
  return { ...node, icon: icons[node.namespace], label: <code>{node.id}</code> };
}

/**
 * Two small trees, each drawn parent first. `core.*` types are the shipped
 * ones in withmarfa/marfa's `packages/types/core/`; the others are examples.
 */
export const trees: readonly (readonly TypeNode[])[] = [
  [
    typeNode({
      id: 'core.file',
      namespace: 'core',
      summary: 'Shipped by Marfa',
      caption: (
        <>
          <code>core.file</code> is a <code>core</code> type: Marfa ships it, and no credential can
          register, replace or delete it. A file is an item whose type inherits from it, and it
          requires <code>blob_ref</code> and <code>mime_type</code>.
        </>
      ),
    }),
    typeNode({
      id: 'core.file.image',
      namespace: 'core',
      from: { id: 'core.file', by: 'parent' },
      summary: 'Shipped, inherits File',
      caption: (
        <>
          <code>core.file.image</code> is shipped too, and no credential can change it. Its{' '}
          <code>parent</code> is <code>core.file</code>, so an image has every file property,{' '}
          <code>blob_ref</code> and <code>mime_type</code> required, and adds <code>width</code>,{' '}
          <code>height</code> and a location.
        </>
      ),
    }),
    typeNode({
      id: 'app.example.receipt',
      namespace: 'app',
      example: true,
      from: { id: 'core.file.image', by: 'parent' },
      summary: 'Example, inherits Image',
      caption: (
        <>
          An example of an app&apos;s own type, in the <code>app</code> namespace. Its{' '}
          <code>parent</code> is <code>core.file.image</code>, so it inherits from{' '}
          <code>core.file</code> too, and a listing of <code>core.file</code> includes receipts. A
          credential whose type map reaches <code>app.example.receipt</code> can register and
          change it.
        </>
      ),
    }),
  ],
  [
    typeNode({
      id: 'core.note',
      namespace: 'core',
      summary: 'Shipped by Marfa',
      caption: (
        <>
          <code>core.note</code> is a <code>core</code> type: Marfa ships it, and no credential can
          register, replace or delete it. It requires <code>body</code>.
        </>
      ),
    }),
    typeNode({
      id: 'user.recipe',
      namespace: 'user',
      example: true,
      from: { id: 'core.note', by: 'compatible' },
      summary: 'Example, reads as Note',
      caption: (
        <>
          An example of your own type, in the <code>user</code> namespace. It names{' '}
          <code>core.note</code> in <code>compatible_with</code>, not <code>parent</code>: it
          inherits nothing, Marfa checks that it requires <code>body</code> as a note does, and a
          listing of <code>core.note</code> leaves it out. A credential whose type map reaches{' '}
          <code>user.recipe</code> can register and change it.
        </>
      ),
    }),
  ],
];

const nodes: readonly TypeNode[] = trees.flat();
const byId = new Map(nodes.map((node) => [node.id, node]));

/** How deep a node sits in its tree, counting the links above it. */
function depthOf(node: TypeNode): number {
  let depth = 0;
  for (let at = node.from; at; at = byId.get(at.id)?.from) depth++;
  return depth;
}

/** The node and every node it hangs from, by either link. */
function chainOf(id: string): Set<string> {
  const chain = new Set<string>();
  for (let at: TypeNode | undefined = byId.get(id); at; at = at.from && byId.get(at.from.id)) {
    chain.add(at.id);
  }
  return chain;
}

/**
 * A few shipped types and two example types, as two trees. Selecting a type
 * lights it and the types it hangs from, and says which namespace owns it,
 * what it inherits, and whether a credential can change it.
 *
 * Each child sits one step in from the type above it, joined by an elbow: a
 * solid one for `parent`, a dashed one for `compatible_with`. Narrow, the
 * trees stack; from 34rem of diagram width they sit side by side.
 */
export function TypeTree() {
  return (
    <Diagram
      label="How types inherit"
      nodes={nodes}
      idleCaption="Select a type to see its namespace, what it inherits, and who can change it."
    >
      {({ selected, toggle }) => {
        const chain = selected === null ? null : chainOf(selected);
        const stateOf = (id: string): DiagramState =>
          chain === null ? 'idle' : chain.has(id) ? 'on' : 'off';

        return (
          <div className="marfa-tt">
            <div className="marfa-tt-trees">
              {trees.map((tree) => (
                <ul key={tree[0].id} className="marfa-tt-tree">
                  {tree.map((node) => {
                    const state = stateOf(node.id);
                    return (
                      <li
                        key={node.id}
                        className="marfa-tt-row"
                        style={{ '--marfa-tt-depth': depthOf(node) } as CSSProperties}
                      >
                        {node.from ? (
                          <DiagramWire
                            className={`marfa-tt-wire marfa-tt-by-${node.from.by}`}
                            state={state}
                          />
                        ) : null}
                        <DiagramBox
                          className="marfa-tt-box"
                          node={node}
                          state={state}
                          onSelect={() => toggle(node.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
            <ul className="marfa-tt-legend" aria-label="Lines">
              <li>
                <span className="marfa-tt-swatch marfa-tt-by-parent" aria-hidden="true" />
                Inherits, by <code>parent</code>
              </li>
              <li>
                <span className="marfa-tt-swatch marfa-tt-by-compatible" aria-hidden="true" />
                Reads as, by <code>compatible_with</code>
              </li>
            </ul>
          </div>
        );
      }}
    </Diagram>
  );
}
