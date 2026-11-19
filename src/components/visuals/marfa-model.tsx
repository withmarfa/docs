import { Database, FileText, FolderOpen, Image, ListChecks, ListFilter, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, Box, Chip, Figure, Flow, Group } from './figure';

/**
 * How Marfa works, on one example: inside the instance, a view lists two
 * items, a photo attached to a note; a kept task moves in from the feed; a
 * deleted item moves out to the bin. Under it, a directory on the computer
 * syncs both ways with the library. The page passes `label`, its text form,
 * which the Markdown copy keeps; the page's prose carries every fact.
 */
export function MarfaModel({ label, caption }: { label: string; caption?: ReactNode }) {
  return (
    <Figure label={label} caption={caption} className="marfa-model">
      <Group label="Your instance" icon={Database} tone="accent">
        <div className="marfa-model-tiers">
          <Group label="The library" subtitle="What you keep">
            <Box icon={ListFilter} title="Lisbon trip" subtitle="A view of items tagged lisbon" />
            <Arrow label="lists" axis="down" className="marfa-model-short" />
            <Flow axis="down" className="marfa-model-edge">
              <Box icon={Image} title="beach.png" subtitle="A file: a photo">
                <Chip>lisbon</Chip>
              </Box>
              <Arrow label="attached to" />
              <Box icon={FileText} title="Packing list" subtitle="A note">
                <Chip>lisbon</Chip>
              </Box>
            </Flow>
          </Group>
          <div className="marfa-model-side">
            <Flow className="marfa-model-move">
              <Arrow label="keep" direction="back" />
              <Group label="The feed" subtitle="What services send">
                <Box icon={ListChecks} title="Book flights" subtitle="A task from Todoist" />
              </Group>
            </Flow>
            <Flow className="marfa-model-move">
              <Arrow label="delete" />
              <Box tone="dashed" icon={Trash2} title="The bin" subtitle="Restore within 60 days" />
            </Flow>
          </div>
        </div>
      </Group>
      <Arrow label="syncs both ways" direction="both" axis="down" className="marfa-model-short" />
      <Group label="~/Documents/Lisbon" subtitle="A directory on your computer" icon={FolderOpen}>
        <Flow axis="across" align="stretch" className="marfa-model-files">
          <Box icon={Image} title="beach.png" />
          <Box icon={FileText} title="Packing list.md" />
        </Flow>
      </Group>
    </Figure>
  );
}
