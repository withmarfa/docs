import { PenLine, Radio, ScrollText, Webhook } from 'lucide-react';
import type { ReactNode } from 'react';
import { Arrow, Box, Branch, Branches, Figure, Flow } from './figure';

/** Three events in the log, oldest first. Their IDs ascend (`events/ids-ascending`). */
export const events = [41, 42, 43] as const;

/**
 * The two ways out of the log. The stream is pulled: your app asks, from a
 * cursor, and replays what it missed (`events/resume-replays-after`). A
 * webhook is pushed: Marfa posts, retrying a failure (`events/retry-schedule`),
 * but never anything from before the webhook existed
 * (`events/webhook-starts-after-creation`).
 */
export const ways = [
  {
    title: 'Event stream',
    subtitle: 'Reads from a cursor',
    icon: Radio,
    who: 'Your app pulls',
    head: 'root',
  },
  {
    title: 'Webhook',
    subtitle: 'Retries, no backfill',
    icon: Webhook,
    who: 'Marfa pushes',
    head: 'child',
  },
] as const;

/**
 * Changes go into the event log, and leave it two ways that point opposite
 * ways: your app pulls from the stream, and Marfa pushes to a webhook.
 */
export function EventFlow({ caption }: { caption?: ReactNode }) {
  return (
    <Figure label="How changes reach your app: the event stream and webhooks" caption={caption} className="marfa-ef">
      <Flow axis="down" className="marfa-ef-flow">
        <Box icon={PenLine} title="Changes" subtitle="To items, edges, tags, extensions" />
        <Arrow axis="down" label="each one appends" />
        <Branches
          stack="never"
          root={
            <Box tone="accent" icon={ScrollText} title="Event log">
              {events.map((id) => (
                <span key={id} className="marfa-ef-event">
                  {id}
                </span>
              ))}
            </Box>
          }
        >
          {ways.map((way) => (
            <Branch key={way.title} head={way.head} label={way.who}>
              <Box icon={way.icon} title={way.title} subtitle={way.subtitle} />
            </Branch>
          ))}
        </Branches>
      </Flow>
    </Figure>
  );
}
