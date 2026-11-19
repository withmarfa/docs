import {
  Bot,
  CircleUserRound,
  Database,
  FileText,
  Image,
  KeyRound,
  ListChecks,
  ListFilter,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, Box, Branches, Chip, Figure, Flow, Group } from './figure';

type Thing = { title: string; subtitle: string; icon: LucideIcon };

/** Who reaches an instance: its one owner, and the credentials the owner gives. */
export const reachers: readonly Thing[] = [
  { title: 'You, the owner', subtitle: 'Signed in with your password', icon: CircleUserRound },
  { title: 'An app or agent', subtitle: 'That you approved in your browser', icon: Bot },
  { title: 'A key', subtitle: 'For a script or a connector', icon: KeyRound },
];

/** The library's example: a photo attached to a note, and a view of the tag both carry. */
export const library = {
  file: { title: 'beach.png', subtitle: 'A file: a photo', icon: Image },
  edge: 'attached to',
  note: { title: 'Packing list', subtitle: 'A note', icon: FileText },
  tag: 'lisbon',
  view: { title: 'Lisbon trip', subtitle: 'A view: every item tagged lisbon', icon: ListFilter },
} as const;

/** The feed's example: what a connector brings in from a service. */
export const feed: Thing = { title: 'Book flights', subtitle: 'A task from Todoist', icon: ListChecks };

export const bin: Thing = { title: 'The bin', subtitle: 'Deleted items, until they expire', icon: Trash2 };

/**
 * The model of an instance on one screen: who reaches it from above, and
 * inside it the library and the feed, each holding items, with the bin beside
 * them. Every fact here is also in the page's prose, which is its text form.
 */
export function MarfaModel({ caption }: { caption?: ReactNode }) {
  return (
    <Figure
      label="How Marfa works: you, an app or agent you approved, and a key each reach your instance. The instance holds the library, with a photo attached to a note, both tagged lisbon, and a view of that tag; the feed, with a task from Todoist; and the bin."
      caption={caption}
      className="marfa-model"
    >
      <Branches
        rootAt="bottom"
        root={
          <Group label="Your instance" icon={Database} tone="accent" className="marfa-model-instance">
            <div className="marfa-model-tiers">
              <Group label="The library" subtitle="What you keep">
                <Flow axis="down" className="marfa-model-edge">
                  <Box icon={library.file.icon} title={library.file.title} subtitle={library.file.subtitle}>
                    <Chip>{library.tag}</Chip>
                  </Box>
                  <Arrow label={library.edge} />
                  <Box icon={library.note.icon} title={library.note.title} subtitle={library.note.subtitle}>
                    <Chip>{library.tag}</Chip>
                  </Box>
                </Flow>
                <Box icon={library.view.icon} title={library.view.title} subtitle={library.view.subtitle} />
              </Group>
              <div className="marfa-model-side">
                <Group label="The feed" subtitle="What arrives from services">
                  <Box icon={feed.icon} title={feed.title} subtitle={feed.subtitle} />
                </Group>
                <Box tone="dashed" icon={bin.icon} title={bin.title} subtitle={bin.subtitle} />
              </div>
            </div>
          </Group>
        }
      >
        {reachers.map((thing) => (
          <Box key={thing.title} icon={thing.icon} title={thing.title} subtitle={thing.subtitle} />
        ))}
      </Branches>
    </Figure>
  );
}
