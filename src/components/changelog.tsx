import Link from 'fumadocs-core/link';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { createContext, use, useMemo, useState, type ReactNode } from 'react';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import type * as PageTree from 'fumadocs-core/page-tree';
import changelog from '@/generated/changelog.json';
import {
  formatDate,
  headingId,
  parseNotes,
  partsOf,
  type Block,
  type Inline,
  type Notes,
  type Release,
} from '@/lib/changelog';

const DOCS_ORIGIN = 'https://docs.marfa.so';

/**
 * The site's page paths, when known. Older notes link pages the site has since
 * removed, and such a link is shown as text rather than sent to a missing page.
 */
const SitePages = createContext<ReadonlySet<string> | null>(null);

/** A link the page may draw: a web address, a mail address or a path. Anything else, such as `javascript:`, is shown as text. */
function safeHref(href: string, pages: ReadonlySet<string> | null = null): string | null {
  if (href.startsWith(DOCS_ORIGIN + '/')) {
    const path = href.slice(DOCS_ORIGIN.length);
    const page = path.replace(/[#?].*$/, '').replace(/(.)\/$/, '$1');
    return pages === null || pages.has(page) ? path : null;
  }
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href) ? href : null;
}

function pageUrls(nodes: PageTree.Node[], into = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.type === 'page') into.add(node.url);
    if (node.type === 'folder') {
      if (node.index) into.add(node.index.url);
      pageUrls(node.children, into);
    }
  }
  return into;
}

function Inlines({ nodes }: { nodes: Inline[] }) {
  const pages = use(SitePages);
  return (
    <>
      {nodes.map((node, index) => {
        switch (node.type) {
          case 'text':
            return node.value;
          case 'code':
            return <code key={index}>{node.value}</code>;
          case 'strong':
            return (
              <strong key={index}>
                <Inlines nodes={node.children} />
              </strong>
            );
          case 'link': {
            const href = safeHref(node.href, pages);
            return href ? (
              <Link key={index} href={href}>
                <Inlines nodes={node.children} />
              </Link>
            ) : (
              <Inlines key={index} nodes={node.children} />
            );
          }
        }
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={index}>
                <Inlines nodes={block.inline} />
              </p>
            );
          case 'code':
            return (
              <pre key={index} className="marfa-cl-code">
                <code>{block.value}</code>
              </pre>
            );
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List key={index}>
                {block.items.map((item, at) => (
                  <li key={at}>
                    <Inlines nodes={item.inline} />
                    <Blocks blocks={item.children} />
                  </li>
                ))}
              </List>
            );
          }
        }
      })}
    </>
  );
}

const H2 = defaultMdxComponents.h2;

/**
 * Filters, then the releases, newest first. The server render shows every
 * part. A filter hides parts and nothing else, so the page never moves a
 * release's heading or summary.
 */
export function ChangelogView({ releases, pages = null }: { releases: Release[]; pages?: ReadonlySet<string> | null }) {
  const notes = useMemo(() => releases.map((release) => parseNotes(release.body)), [releases]);
  const parts = useMemo(() => partsOf(notes), [notes]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  if (releases.length === 0) return null;

  const toggle = (name: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(name)) next.add(name);
      return next.size === parts.length ? new Set() : next;
    });

  return (
    <SitePages value={pages}>
      <div className="marfa-cl">
        {parts.length > 1 ? (
          <div className="marfa-cl-filters">
            <div className="marfa-cl-filter-options" role="group" aria-label="Filter by part">
              <button
                type="button"
                className="marfa-cl-filter-button"
                aria-pressed={selected.size === 0}
                onClick={() => setSelected(new Set())}
              >
                All parts
              </button>
              {parts.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="marfa-cl-filter-button"
                  aria-pressed={selected.has(name)}
                  onClick={() => toggle(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {releases.map((release, index) => (
          <ReleaseEntry key={release.tag} release={release} notes={notes[index]} selected={selected} />
        ))}
      </div>
    </SitePages>
  );
}

function ReleaseEntry({ release, notes, selected }: { release: Release; notes: Notes; selected: ReadonlySet<string> }) {
  const filtering = selected.size > 0;
  const fullChangelog = notes.fullChangelog ? safeHref(notes.fullChangelog) : null;
  const shown = notes.parts.filter((part) => !filtering || selected.has(part.name));
  return (
    <article className="marfa-cl-release">
      <H2 id={headingId(release.tag)}>{release.tag}</H2>
      <div className="marfa-cl-meta">
        <time dateTime={release.publishedAt}>{formatDate(release.publishedAt)}</time>
        {notes.breaking.length > 0 ? <span className="marfa-cl-breaking">Breaking</span> : null}
        <Link href={fullChangelog ?? release.url}>{fullChangelog ? 'Full changelog' : 'Release on GitHub'}</Link>
      </div>
      <Blocks blocks={notes.summary} />
      <Blocks blocks={notes.breaking} />
      {notes.parts.map((part) => (
        <section key={part.name} className="marfa-cl-part" aria-label={part.name} hidden={!shown.includes(part)}>
          <span className="marfa-cl-tag">{part.name}</span>
          <Blocks blocks={part.blocks} />
        </section>
      ))}
      {filtering && shown.length === 0 && notes.parts.length > 0 ? (
        <p className="marfa-cl-none">No changes to the selected parts.</p>
      ) : null}
    </article>
  );
}

/** The Changelog page's releases, from the GitHub release notes that `scripts/sync-changelog.ts` writes. */
export function Changelog(): ReactNode {
  const { full } = useTreeContext();
  const pages = useMemo(() => pageUrls(full.children), [full]);
  return <ChangelogView releases={changelog as Release[]} pages={pages} />;
}
