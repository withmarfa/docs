import { Fragment, type ReactNode } from 'react';
import { Arrow, Box, Figure, Group } from './figure';

export type TypeEntry = { id: string; subtitle: ReactNode };

/** A chain of types, parent first. Each names the one before it as its `parent`. */
export const chain: readonly TypeEntry[] = [
  {
    id: 'core.file',
    subtitle: (
      <>
        Requires <code>blob_ref</code> and <code>mime_type</code>
      </>
    ),
  },
  { id: 'core.file.image', subtitle: 'Adds width, height, location' },
  { id: 'app.example.receipt', subtitle: 'An app’s own type' },
];

/** A type and one that names it in `compatible_with`, so inherits nothing from it. */
export const compatible: { target: TypeEntry; claimant: TypeEntry } = {
  target: {
    id: 'core.note',
    subtitle: (
      <>
        Requires <code>body</code>
      </>
    ),
  },
  claimant: {
    id: 'user.recipe',
    subtitle: (
      <>
        Your type, requires <code>body</code> too
      </>
    ),
  },
};

/**
 * What a listing that names a type returns, drawn as a frame around it: the
 * types under a type through `parent` are inside its listing, and a type that
 * is only compatible with it stays outside.
 */
export function TypeInheritance({ caption }: { caption?: ReactNode }) {
  return (
    <Figure label="Which types a listing of a type returns" caption={caption} className="marfa-ti">
      <Group label={<code>GET /items?type=core.file</code>} subtitle="Returns all three" className="marfa-ti-listing">
        {chain.map((type, index) => (
          <Fragment key={type.id}>
            {index > 0 ? <Arrow axis="down" direction="back" label={<code>parent</code>} /> : null}
            <Box title={<code>{type.id}</code>} subtitle={type.subtitle} />
          </Fragment>
        ))}
      </Group>
      <div className="marfa-ti-side">
        <Group label={<code>GET /items?type=core.note</code>} subtitle={<>Leaves <code>user.recipe</code> out</>} className="marfa-ti-listing">
          <Box title={<code>{compatible.target.id}</code>} subtitle={compatible.target.subtitle} />
        </Group>
        <Arrow axis="down" direction="back" dashed label={<code>compatible_with</code>} />
        <Box tone="dashed" title={<code>{compatible.claimant.id}</code>} subtitle={compatible.claimant.subtitle} />
      </div>
    </Figure>
  );
}
