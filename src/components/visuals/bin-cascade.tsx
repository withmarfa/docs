import { BookOpen, StickyNote } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Arrow, Box, Figure } from './figure';
import { Choices, Controls, Result, Swap } from './interactive';

/** The three items the figure draws: a note, its child note and a book it is about. */
export type ItemId = 'note' | 'child' | 'book';

export type OnDelete = 'cascade' | 'orphan';

export type Item = { id: ItemId; title: string; type: string };

export const items: Record<ItemId, Item> = {
  note: { id: 'note', title: 'Reading list', type: 'core.note' },
  child: { id: 'child', title: 'Child note', type: 'core.note' },
  book: { id: 'book', title: 'Book', type: 'core.media.book' },
};

/** The note's two edges, drawn from it. `onDelete` is the edge type's `cascade_on_delete`. */
export const edges: readonly { type: string; onDelete: OnDelete; to: ItemId }[] = [
  { type: 'parent-of', onDelete: 'cascade', to: 'child' },
  { type: 'about', onDelete: 'orphan', to: 'book' },
];

export const choices: readonly { id: ItemId; label: string }[] = [
  { id: 'note', label: 'Bin the note' },
  { id: 'child', label: 'Bin the child note' },
  { id: 'book', label: 'Bin the book' },
];

/**
 * What trashing one item does to the others. A cascading edge, which only
 * `parent-of` is among the shipped types, takes its target into the bin with
 * its source, at every depth (`items/trash-cascade`), and never the other way,
 * because the walk follows outbound edges only. An edge that orphans leaves the
 * other end active, whichever end is trashed, and the edge stays
 * (`edges/orphan-shipped`).
 */
export function trashed(root: ItemId): ItemId[] {
  return root === 'note' ? ['note', 'child'] : [root];
}

export const messages: Record<ItemId, string> = {
  note: 'The child note goes too, because `parent-of` cascades. The book stays, because `about` orphans.',
  child: 'Only the child note goes. A cascade runs from an edge\'s source to its target, never back.',
  book: 'Only the book goes. `about` orphans, so the note stays and keeps its edge.',
};

function ItemBox({ item, root }: { item: Item; root: ItemId }) {
  const gone = trashed(root).includes(item.id);
  return (
    <Box
      className="marfa-ix-box"
      tone={gone ? 'dashed' : 'default'}
      icon={item.id === 'book' ? BookOpen : StickyNote}
      title={item.title}
      aside={
        <span className="marfa-ix-pill" data-lit={gone || undefined}>
          <Swap values={{ active: 'active', trashed: 'trashed' }} current={gone ? 'trashed' : 'active'} />
        </span>
      }
      subtitle={<code>{item.type}</code>}
    />
  );
}

/**
 * One note with a child note and a book, and what trashing each of them does
 * to the others: the `parent-of` edge cascades and the `about` edge orphans.
 * It opens with the note in the bin. Only highlights, borders and text
 * change, so the layout never moves.
 */
export function BinCascade({ caption }: { caption?: ReactNode }) {
  const [root, setRoot] = useState<ItemId>('note');

  return (
    <Figure label="What moving an item to the bin does to the items its edges reach" caption={caption} className="marfa-ix marfa-bc">
      <Controls>
        <Choices label="Move an item to the bin" options={choices} value={root} onChange={setRoot} />
      </Controls>

      <Result messages={messages} current={root} />

      <div className="marfa-ix-parts">
        <ItemBox item={items.note} root={root} />
      </div>
      <div className="marfa-ix-edges">
        {edges.map((edge) => (
          <div key={edge.type} className="marfa-ix-edge">
            <Arrow
              axis="across"
              label={
                <>
                  <code>{edge.type}</code> <span className="marfa-ix-edge-aside">{edge.onDelete}</span>
                </>
              }
            />
            <ItemBox item={items[edge.to]} root={root} />
          </div>
        ))}
      </div>
    </Figure>
  );
}
