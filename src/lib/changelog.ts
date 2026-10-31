/**
 * The Changelog page's release notes. `scripts/sync-changelog.ts` writes the
 * releases to `src/generated/changelog.json`; this module reads their notes
 * and writes the page's Markdown copy and search rows. It imports nothing from
 * the site so that `source.config.ts` can use it.
 *
 * The notes have a fixed shape, which an agent writes after each release: a
 * one-sentence summary, an optional `**Breaking:**` paragraph, a `###` section
 * for each part that changed, and a `**Full changelog:**` link. The parser
 * accepts any Markdown of that kind and never rewrites it.
 */

/** The parts a release's notes name, in the order the notes list them. */
export const PARTS = ['Server', 'CLI', 'Core', 'TypeScript SDK', 'Swift SDK'] as const;

/** A release as `src/generated/changelog.json` holds it. */
export interface Release {
  tag: string;
  publishedAt: string;
  url: string;
  body: string;
}

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] };

export type Block =
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'code'; value: string }
  | { type: 'list'; ordered: boolean; items: ListItem[] };

export interface ListItem {
  inline: Inline[];
  /** A list nested under the item. */
  children: Block[];
}

export interface Notes {
  /** What the release changed for a person: everything before the Breaking paragraph, or before the first part when there is none. */
  summary: Block[];
  /** From the paragraph that starts `**Breaking:**` to the first part, so a list after it stays with it. Empty when the release breaks nothing. */
  breaking: Block[];
  parts: { name: string; blocks: Block[] }[];
  /** The address the `**Full changelog:**` line names, or `null`. */
  fullChangelog: string | null;
}

// ── Inline Markdown ─────────────────────────────────────────────────────

const TOKEN = /`([^`]+)`|\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)|(https?:\/\/[^\s<>)]*[^\s<>).,;:!?])/g;

/** Code, bold, links and bare addresses, which is all the notes use. Anything else stays as text. */
export function parseInline(text: string): Inline[] {
  const nodes: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    if (match.index > last) nodes.push({ type: 'text', value: text.slice(last, match.index) });
    if (match[1] !== undefined) nodes.push({ type: 'code', value: match[1] });
    else if (match[2] !== undefined) nodes.push({ type: 'strong', children: parseInline(match[2]) });
    else if (match[3] !== undefined) nodes.push({ type: 'link', href: match[4], children: parseInline(match[3]) });
    else nodes.push({ type: 'link', href: match[5], children: [{ type: 'text', value: match[5] }] });
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push({ type: 'text', value: text.slice(last) });
  return nodes;
}

/** The text of inline nodes with no markup. */
export function plainText(nodes: Inline[]): string {
  return nodes.map((node) => (node.type === 'text' || node.type === 'code' ? node.value : plainText(node.children))).join('');
}

// ── Blocks ──────────────────────────────────────────────────────────────

const BULLET = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const FENCE = /^\s*(`{3,}|~{3,})/;

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function parseList(lines: string[], start: number): [Block, number] {
  const base = indentOf(lines[start]);
  const ordered = /^\s*\d+\./.test(lines[start]);
  const items: ListItem[] = [];
  let i = start;
  while (i < lines.length) {
    const match = BULLET.exec(lines[i]);
    if (!match || indentOf(lines[i]) !== base) break;
    let text = match[3].trim();
    i++;
    // A wrapped item continues on indented lines.
    while (i < lines.length && lines[i].trim() !== '' && !BULLET.test(lines[i]) && !FENCE.test(lines[i]) && indentOf(lines[i]) > base) {
      text += ` ${lines[i].trim()}`;
      i++;
    }
    const item: ListItem = { inline: parseInline(text), children: [] };
    // A deeper bullet starts a nested list.
    while (i < lines.length && BULLET.test(lines[i]) && indentOf(lines[i]) > base) {
      const [nested, next] = parseList(lines, i);
      item.children.push(nested);
      i = next;
    }
    items.push(item);
    // A blank line between items keeps the list going; anything else ends it.
    let peek = i;
    while (peek < lines.length && lines[peek].trim() === '') peek++;
    if (peek < lines.length && BULLET.test(lines[peek]) && indentOf(lines[peek]) === base) i = peek;
  }
  return [{ type: 'list', ordered, items }, i];
}

/** Paragraphs, bullet lists (nested ones too) and fenced code. */
export function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !(FENCE.exec(lines[i])?.[1][0] === fence[1][0] && lines[i].trim().length >= fence[1].length)) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', value: code.join('\n') });
      continue;
    }
    if (BULLET.test(line)) {
      const [list, next] = parseList(lines, i);
      blocks.push(list);
      i = next;
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !BULLET.test(lines[i]) && !FENCE.test(lines[i])) {
      paragraph.push(lines[i].trim().replace(/^#{4,6}\s+(.*?)\s*#*$/, '**$1**'));
      i++;
    }
    blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join(' ')) });
  }
  return blocks;
}

// ── Release notes ───────────────────────────────────────────────────────

const HEADING = /^#{2,3}\s+(.+?)\s*#*\s*$/;
/** `**Full changelog:** <address>` or `**Full changelog:** [text](<address>)`, which is what GitHub's generated notes write. */
const FULL_CHANGELOG = /^\*\*Full changelog:?\*\*:?\s*(?:\[[^\]]*\]\((\S+)\)|(\S+))\s*$/i;
/** A line that starts the Breaking paragraph. */
const BREAKING_LINE = /^\s*\*\*breaking:?\*\*/i;

function isBreaking(block: Block): boolean {
  if (block.type !== 'paragraph') return false;
  const [first] = block.inline;
  return first?.type === 'strong' && /^breaking:?$/i.test(plainText(first.children).trim());
}

/** The notes of one release, split into its summary, Breaking paragraphs, parts and Full changelog link. */
export function parseNotes(body: string): Notes {
  const sections: { name: string | null; lines: string[] }[] = [{ name: null, lines: [] }];
  let fullChangelog: string | null = null;
  let fence: string | null = null;
  for (const line of body.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    const marker = FENCE.exec(line)?.[1][0] ?? null;
    if (fence === null && marker) fence = marker;
    else if (fence !== null && marker === fence) fence = null;
    const heading = fence === null && marker === null ? HEADING.exec(line) : null;
    const link = fence === null && marker === null ? FULL_CHANGELOG.exec(line.trim()) : null;
    if (heading) sections.push({ name: plainText(parseInline(heading[1])).trim(), lines: [] });
    else if (link) fullChangelog = link[1] ?? link[2];
    else {
      const lines = sections[sections.length - 1].lines;
      // A Breaking line that follows the summary with no blank line between is still its own paragraph.
      if (sections.length === 1 && fence === null && marker === null && BREAKING_LINE.test(line) && lines.length > 0 && lines[lines.length - 1].trim() !== '') lines.push('');
      lines.push(line);
    }
  }

  const lead = parseBlocks(sections[0].lines);
  const at = lead.findIndex(isBreaking);
  return {
    summary: at === -1 ? lead : lead.slice(0, at),
    breaking: at === -1 ? [] : lead.slice(at),
    parts: sections.slice(1).map(({ name, lines }) => ({ name: name ?? '', blocks: parseBlocks(lines) })),
    fullChangelog,
  };
}

/** The part names across releases that the filter offers: the known parts in their order, then any other. */
export function partsOf(notes: Notes[]): string[] {
  const names = new Set(notes.flatMap((n) => n.parts.map((part) => part.name)));
  const known = PARTS.filter((name) => names.has(name));
  return [...known, ...[...names].filter((name) => !(PARTS as readonly string[]).includes(name))];
}

// ── The page ────────────────────────────────────────────────────────────

/** A release's date as the page shows it: `October 31, 2026`. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** The id of a release's heading, which is what Fumadocs makes of the same text: `v0.0.51` becomes `v0051`. */
export function headingId(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9_ -]/g, '').replace(/ /g, '-');
}

/** The "On this page" entries for the releases, which the page's headings cannot supply because a component draws them. */
export function releaseToc(releases: Release[]): { title: string; url: string; depth: number }[] {
  return releases.map((release) => ({ title: release.tag, url: `#${headingId(release.tag)}`, depth: 2 }));
}

/**
 * The Markdown copy of the page's releases, which agents read. Every release
 * and every line of its notes is kept; only a heading above level 3 moves
 * down, so that no notes heading outranks the release's own.
 */
export function changelogMarkdown(releases: Release[]): string {
  return releases
    .map((release) => {
      let fence: string | null = null;
      const body = release.body
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => {
          const marker = FENCE.exec(line)?.[1][0] ?? null;
          if (fence === null && marker) fence = marker;
          else if (fence !== null && marker === fence) fence = null;
          return fence === null && marker === null ? line.replace(/^#{1,2}(?=\s)/, '###') : line;
        })
        .join('\n')
        .trim();
      const head = `## ${release.tag}\n\nReleased ${formatDate(release.publishedAt)}. [${release.tag} on GitHub](${release.url})`;
      return body ? `${head}\n\n${body}` : head;
    })
    .join('\n\n');
}

// ── Search ──────────────────────────────────────────────────────────────

/** A passage of the page's text for the search index: the words of one block, or of one item with the part it belongs to. */
export interface IndexRow {
  /** The id of the release's heading, which the passage's search result links to. */
  heading: string;
  content: string;
}

function itemTexts(items: ListItem[]): string[] {
  return items.flatMap((item) => [plainText(item.inline), ...item.children.flatMap(blockTexts)]);
}

function blockTexts(block: Block): string[] {
  switch (block.type) {
    case 'paragraph':
      return [plainText(block.inline)];
    case 'code':
      return [block.value];
    case 'list':
      return itemTexts(block.items);
  }
}

/**
 * The text of the releases as search passages. The page draws its releases from
 * a data file, so its MDX holds nothing to index; these are what a reader
 * could find there: each release's version and date, its summary and Breaking
 * paragraphs, and each change under the part it names.
 */
export function releaseRows(releases: Release[]): IndexRow[] {
  return releases.flatMap((release) => {
    const heading = headingId(release.tag);
    const notes = parseNotes(release.body);
    const rows = [
      `${release.tag}, released ${formatDate(release.publishedAt)}`,
      ...[...notes.summary, ...notes.breaking].flatMap(blockTexts),
      ...notes.parts.flatMap((part) => part.blocks.flatMap(blockTexts).map((text) => `${part.name}: ${text}`)),
    ];
    return rows.filter((content) => content.trim() !== '').map((content) => ({ heading, content }));
  });
}

/** The part of an MDX syntax tree node that the search step reads. */
interface TreeNode {
  type: string;
  name?: string | null;
  children?: TreeNode[];
  data?: object;
}

/**
 * A remark plugin that puts the releases into the Changelog page's search
 * index. Fumadocs indexes the text of each page's MDX, and `<Changelog />` has
 * no text there. Fumadocs's structure step reads `data.structuredData` from a
 * node it stringifies, so the step runs after this one and takes the rows from
 * the component's node. The page itself is unchanged.
 */
export function remarkChangelogIndex(read: () => Release[]) {
  return () => {
    let rows: IndexRow[] | undefined;
    const visit = (node: TreeNode) => {
      if (node.type === 'mdxJsxFlowElement' && node.name === 'Changelog') {
        rows ??= releaseRows(read());
        node.data = { ...node.data, structuredData: { contents: rows } };
      }
      node.children?.forEach(visit);
    };
    return (tree: TreeNode) => visit(tree);
  };
}
