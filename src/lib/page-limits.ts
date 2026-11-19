/**
 * The rules that hold every page to its kind (STYLE.md, "Page types"): what a
 * word is, how a page is measured, how its kind is known and what each kind may
 * hold. `page-limits.test.ts` runs these over the real pages and over bad
 * samples. The numbers live in `page-limits.json`.
 *
 * How a page is measured:
 * - A word is a run of characters between spaces or table pipes that holds at
 *   least one letter or digit. A link counts as its text. Markup that holds no
 *   letter or digit (`#`, `-`, `|`, `---`) is not a word.
 * - Prose is what a reader reads: paragraphs, headings (ATX, indented up to
 *   three spaces, and setext), lists, hand-written tables, inline code, and
 *   the text a component shows in an attribute (`title`, `description`, `items`
 *   and every other attribute but the technical ones in `NOT_PROSE`, and a
 *   fence's `title`, `note` and `tab` labels). It leaves out the frontmatter, fenced code
 *   blocks, the rest of the MDX markup, comments, images, link addresses, and
 *   every `<include>`. An include may show only a file from `src/generated/`,
 *   so a generated table never counts and no other text can slip past the
 *   count; `checkPages` fails any other include.
 * - A code block is one fence. A `Terminal` is one block, and so are
 *   consecutive fences that carry a `tab` (code tabs).
 * - A Terminal's length is the lines of its command and its sample output
 *   together. A fence's length is its lines. A text fence is one with no
 *   language or a prose one (`text`, `md` and the like), which holds prose
 *   in disguise, so it has a lower cap than other code.
 * - An entry is an H2 or an H3 and everything under it up to the next H1, H2 or
 *   H3: an H4 or deeper heading, and what is under it, belongs to the entry above.
 *
 * How a page's kind is known, in this order:
 * 1. A file whose name starts with `fix-` is a fix page.
 * 2. Otherwise `kind` in the frontmatter, which must be a kind in the JSON.
 * 3. Otherwise the page's own entry under `pages`, then the entry of the
 *    longest folder that holds it. An entry with a `limit` and no kind is a
 *    reference page.
 * A page that none of these names fails, and so does one that two say
 * differently. However it is named, the kind must be one the page's entry
 * lists (`kind` and `kinds`; a `limit` with no kind allows `reference`), so a
 * page cannot choose a kind with a bigger budget than its place allows.
 */

import path from 'node:path';
import { parse as parseYaml } from 'yaml';

/** A kind's caps. A cap a kind lacks does not apply to it. */
export interface KindCaps {
  words?: number;
  codeBlocks?: number;
  h2?: number;
  /** The most entries a fix page holds. */
  entries?: number;
  /** The most prose words in one entry of a fix page. */
  entryWords?: number;
  /** The most code blocks in one entry of a fix page. */
  entryCodeBlocks?: number;
  /** The most lines in one fence. */
  fenceLines?: number;
  /** The most lines in one text fence, which holds prose in disguise. */
  textFenceLines?: number;
}

/** What a page may exceed. Every limit above its kind's ceiling carries a reason. */
export interface Entry {
  /** The kind its pages take unless they declare another. */
  kind?: string;
  /** The other kinds its pages may declare. A kind not listed here or in `kind` fails the page. */
  kinds?: string[];
  limit?: number;
  reason?: string;
}

/** The measures a pending page's ceilings are named by. */
export type Measure =
  | 'words'
  | 'codeBlocks'
  | 'h2'
  | 'terminalLines'
  | 'entries'
  | 'entryWords'
  | 'entryCodeBlocks'
  | 'fenceLines'
  | 'textFenceLines';

/** A page waiting for its rewrite: each measure it exceeds today, at its current value, and whether it lacks a job. */
export type Pending = Partial<Record<Measure, number>> & { reason: string; missingJob?: boolean };

export interface Limits {
  kinds: Record<string, KindCaps>;
  /** The most lines in one `Terminal` (its command and its sample output), and on a Start page. */
  terminalLines: number;
  startTerminalLines: number;
  jobWords: number;
  /** The most words in a page's frontmatter `title` and `description`, which a reader sees. */
  titleWords: number;
  descriptionWords: number;
  folders: Record<string, Entry>;
  pages: Record<string, Entry>;
  pending: Record<string, Pending>;
}

export const MEASURES: Measure[] = [
  'words',
  'codeBlocks',
  'h2',
  'terminalLines',
  'entries',
  'entryWords',
  'entryCodeBlocks',
  'fenceLines',
  'textFenceLines',
];

/** What a measure counts, as a message says it, and what to do when a page is over. */
const RULES: Record<Measure, { what: string; fix: string }> = {
  words: { what: 'prose words', fix: 'Cut it, move detail to the reference or another page, or split the page.' },
  codeBlocks: { what: 'code blocks', fix: 'Show only the code each step adds, or move the rest to the reference.' },
  h2: { what: 'H2 headings', fix: 'A page with this many sections does more than one job: split it.' },
  terminalLines: { what: 'lines in one Terminal (the command and its output)', fix: 'Show one command and only the output lines that prove it worked.' },
  entries: { what: 'entries', fix: 'Keep the messages a reader meets and link the rest to Errors.' },
  entryWords: { what: 'prose words in one entry', fix: 'Give the cause in one sentence and the fix in one step.' },
  entryCodeBlocks: { what: 'code blocks in one entry', fix: 'Show the one command or message that fixes it, and link the rest.' },
  fenceLines: { what: 'lines in one code block', fix: 'Show only the lines the reader needs, and link the complete source.' },
  textFenceLines: { what: 'lines in one text or unlabeled block', fix: 'Prose belongs in the page, where it is counted. Keep a block of text to what a reader copies or sees on screen.' },
};

export interface Measured {
  words: number;
  codeBlocks: number;
  h2: number;
  /** The most lines in any one `Terminal`: its command and its sample output together. */
  terminalLines: number;
  /** Every H2 and H3 with the prose words under it, up to the next H1, H2 or H3. */
  entries: { heading: string; words: number }[];
  /** The most code blocks in one entry, or before the first entry. */
  entryCodeBlocks: number;
  /** The most lines in any one fence. */
  fenceLines: number;
  /** The most lines in any one text or unlabeled fence. */
  textFenceLines: number;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** A page's frontmatter fields, and its body. Invalid YAML gives no fields: the content lint reports it. */
export function splitPage(text: string): { fields: Record<string, unknown>; body: string } {
  const match = FRONTMATTER.exec(text);
  if (!match) return { fields: {}, body: text };
  let fields: Record<string, unknown> = {};
  try {
    const data: unknown = parseYaml(match[1]);
    if (data && typeof data === 'object') fields = data as Record<string, unknown>;
  } catch {
    // The content lint names the page.
  }
  return { fields, body: text.slice(match[0].length) };
}

// An attribute value is a quoted string or one `{...}` expression with one level inside.
const ATTRIBUTES = String.raw`(?:\s+[\w:.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\}))?)*`;
const INCLUDE = /<include\b[^>]*?(?:\/>|>[\s\S]*?<\/include>)/g;
const TAG = new RegExp(String.raw`</?[A-Za-z][\w.:-]*${ATTRIBUTES}\s*/?>`, 'g');
const COMMENT = /\{\/\*[\s\S]*?\*\/\}|<!--[\s\S]*?-->/g;
const ATTRIBUTE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{((?:[^{}]|\{[^{}]*\})*)\})/g;
const STRING_LITERAL = /"([^"]*)"|'([^']*)'|`([^`]*)`/g;

/**
 * Attributes that hold no text a reader reads: addresses, identifiers, flags
 * and handlers. Every other attribute is prose, so a component cannot carry
 * words in one that the count does not see.
 */
const NOT_PROSE = new Set([
  'href', 'src', 'id', 'key', 'ref', 'type', 'value', 'cwd', 'lang', 'icon', 'target', 'rel', 'as', 'to',
  'class', 'classname', 'style', 'role', 'tab-group', 'paged',
]);

/** A fence's language, which is empty when the info string starts with an attribute or holds nothing. */
const LANGUAGE = /^([^\s=]+)(?:\s|$)/;
/** Languages whose blocks hold prose, with those that name none. */
const TEXT_LANGUAGES = new Set(['text', 'txt', 'plain', 'plaintext', 'md', 'markdown', 'mdx', 'none']);

/** Marks where a fence stood in the prose, so each one is found in its section. */
const FENCE_MARK = '\u0001';
/** Starts a run of words that came from an attribute, so it can never read as a heading. */
const ATTRIBUTE_MARK = '\u0002';

/** Words in a run of prose: tokens with a letter or a digit, after links are cut to their text. */
export function wordsOf(text: string): number {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(/[\s|]+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** The text a tag shows in its attributes: each string value, from a quoted string or inside an expression. */
function attributeText(tag: string, only?: ReadonlySet<string>): string {
  const values: string[] = [];
  const rest = tag.replace(/^<\/?[A-Za-z][\w.:-]*/, '');
  for (const match of rest.matchAll(ATTRIBUTE)) {
    const name = match[1].toLowerCase();
    if (only ? !only.has(name) : NOT_PROSE.has(name)) continue;
    if (match[4] === undefined) values.push(match[2] ?? match[3]);
    else for (const literal of match[4].matchAll(STRING_LITERAL)) values.push(literal[1] ?? literal[2] ?? literal[3]);
  }
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => `${ATTRIBUTE_MARK}${value}`)
    .join(' ');
}

/** Text without MDX markup, which keeps the words in a tag's attributes and the fence marks. A tag inside inline code is code, so it stays. */
function stripMarkup(text: string): string {
  return text
    .replace(COMMENT, (comment) => FENCE_MARK.repeat(comment.split(FENCE_MARK).length - 1))
    .replace(INCLUDE, '')
    .replace(/(`+)(?:(?!\1)[\s\S])*?\1|(<\/?[A-Za-z])/g, (match, ticks: string | undefined) => (ticks ? match : `\u0000${match}`))
    .replace(new RegExp(`\u0000(${TAG.source})`, 'g'), (_, tag: string) => {
      const shown = attributeText(tag);
      return shown ? ` ${shown} ` : '';
    })
    .replace(/\u0000/g, '');
}

interface Fence {
  info: string;
  lines: number;
  /** Whether it holds prose in disguise: no language, or `text`, `md` and the like. */
  textual: boolean;
  /** The number of the `Terminal` it is in, if any, and its place in it. */
  terminal?: { id: number; index: number };
  /** Whether prose stands between it and the fence before it. */
  afterProse: boolean;
}

/**
 * The prose of a body with its code blocks left out, and the code blocks. A
 * line holding only `FENCE_MARK` stands where each fence was, in order, and a
 * fence's `title` and `note` stay as prose.
 */
function scan(body: string): { prose: string; fences: Fence[] } {
  const prose: string[] = [];
  const fences: Fence[] = [];
  let open: { char: string; length: number; fence: Fence } | undefined;
  let terminals = 0;
  let terminalId: number | undefined;
  let inTerminal = 0;
  let proseSince = true;

  for (const line of body.split(/\r?\n/)) {
    const marker = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (open) {
      if (marker && marker[1][0] === open.char && marker[1].length >= open.length && marker[2].trim() === '') {
        open = undefined;
      } else {
        open.fence.lines++;
      }
      continue;
    }
    if (marker) {
      const info = marker[2].trim();
      const language = LANGUAGE.exec(info)?.[1].toLowerCase();
      const fence: Fence = { info, lines: 0, textual: language === undefined || TEXT_LANGUAGES.has(language), afterProse: proseSince };
      if (terminalId !== undefined) fence.terminal = { id: terminalId, index: inTerminal++ };
      fences.push(fence);
      open = { char: marker[1][0], length: marker[1].length, fence };
      prose.push(FENCE_MARK);
      const caption = attributeText(`<x ${info.replace(LANGUAGE, '')}>`, new Set(['title', 'note', 'tab']));
      if (caption) prose.push(caption);
      proseSince = false;
      continue;
    }
    if (/<Terminal(?=[\s>])/.test(line)) {
      terminalId = terminals++;
      inTerminal = 0;
    }
    if (/<\/Terminal>/.test(line)) terminalId = undefined;
    if (line.trim() !== '' && !/^\s*<\/?[A-Za-z][^>]*>\s*$/.test(line)) proseSince = true;
    prose.push(line);
  }
  return { prose: prose.join('\n'), fences };
}

/** The prose of a page's body: what the words are counted in. */
export function proseText(body: string): string {
  return stripMarkup(scan(body).prose).replace(new RegExp(FENCE_MARK, 'g'), '');
}

const ATX_HEADING = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
/** A line that cannot be the text of a setext heading: a list item, a quote, a table row, code or a heading. */
const NOT_HEADING_TEXT = /^(?: {4}|\t)|^ {0,3}(?:[-*+]|\d+[.)])(?:[ \t]|$)|^ {0,3}[>|]|^ {0,3}#{1,6}(?:[ \t]|$)/;

/** Lines with each setext heading written as an ATX heading, so one pattern finds every heading. */
function atxHeadings(lines: string[]): string[] {
  const out: string[] = [];
  let start = -1;
  for (const line of lines) {
    const underline = SETEXT_UNDERLINE.exec(line);
    if (underline && start !== -1) {
      const text = out.splice(start).map((part) => part.trim()).join(' ');
      out.push(`${underline[1][0] === '=' ? '#' : '##'} ${text}`);
      start = -1;
      continue;
    }
    out.push(line);
    if (line.replace(new RegExp(FENCE_MARK, 'g'), '').trim() === '' || NOT_HEADING_TEXT.test(line)) start = -1;
    else if (start === -1) start = out.length - 1;
  }
  return out;
}

interface Section {
  heading: string;
  lines: string[];
}

/** Measures a page's body. */
export function measure(body: string): Measured {
  const { prose, fences } = scan(body);
  const lines = atxHeadings(stripMarkup(prose).split('\n'));

  const sections: Section[] = [];
  const owner: (Section | undefined)[] = [];
  const all: string[] = [];
  let h2 = 0;
  let current: Section | undefined;
  for (const line of lines) {
    for (let marks = line.split(FENCE_MARK).length - 1; marks > 0; marks--) owner.push(current);
    const text = line.replace(new RegExp(FENCE_MARK, 'g'), '');
    all.push(text);
    const heading = ATX_HEADING.exec(text);
    if (!heading) {
      current?.lines.push(text);
      continue;
    }
    const level = heading[1].length;
    if (level === 2) h2++;
    if (level === 2 || level === 3) {
      current = { heading: heading[2], lines: [] };
      sections.push(current);
    } else if (level === 1) {
      current = undefined;
    } else {
      current?.lines.push(heading[2]);
    }
  }
  const entries = sections.map((section) => ({ heading: section.heading, words: wordsOf(section.lines.join('\n')) }));

  // Code blocks: a Terminal is one, and consecutive fences with a `tab` are one.
  let codeBlocks = 0;
  let previousTab = false;
  const inEntry = new Map<Section | undefined, number>();
  const block = (section: Section | undefined) => {
    codeBlocks++;
    inEntry.set(section, (inEntry.get(section) ?? 0) + 1);
  };
  const terminalLength = new Map<number, number>();
  let fenceLines = 0;
  let textFenceLines = 0;
  fences.forEach((fence, index) => {
    fenceLines = Math.max(fenceLines, fence.lines);
    if (fence.textual) textFenceLines = Math.max(textFenceLines, fence.lines);
    if (fence.terminal) {
      if (!terminalLength.has(fence.terminal.id)) block(owner[index]);
      terminalLength.set(fence.terminal.id, (terminalLength.get(fence.terminal.id) ?? 0) + fence.lines);
      previousTab = false;
      return;
    }
    const tab = /(?:^|\s)tab=/.test(fence.info);
    if (!(tab && previousTab && !fence.afterProse)) block(owner[index]);
    previousTab = tab;
  });

  return {
    words: wordsOf(all.join('\n')),
    codeBlocks,
    h2,
    terminalLines: Math.max(0, ...terminalLength.values()),
    entries,
    entryCodeBlocks: Math.max(0, ...inEntry.values()),
    fenceLines,
    textFenceLines,
  };
}

/** The `<include>` tags a page's prose holds, as the files they name. */
export function includesOf(body: string): { file: string; cwd: boolean }[] {
  const prose = scan(body)
    .prose.replace(COMMENT, '')
    .replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, '');
  return [...prose.matchAll(INCLUDE)].map((match) => {
    const attributes = /^<include\b([^>]*?)\/?>/.exec(match[0])?.[1] ?? '';
    const inner = />([\s\S]*?)<\/include>$/.exec(match[0])?.[1] ?? '';
    return { file: inner.trim().replace(/#.*$/, ''), cwd: /\bcwd\b/.test(attributes) };
  });
}

/** Whether an include is a file the sync writes, the only text the count may skip. */
export function isGeneratedInclude(page: string, include: { file: string; cwd: boolean }): boolean {
  if (include.file === '') return false;
  const resolved = include.cwd ? path.posix.normalize(include.file) : path.posix.normalize(path.posix.join('content/docs', path.posix.dirname(page), include.file));
  return resolved.startsWith('src/generated/');
}

/** What is wrong with a job line, or nothing. An absent line is its own case. */
export function jobProblem(job: unknown, maxWords: number): string | undefined {
  if (typeof job !== 'string' || job.trim() === '') return 'the `job` line in the frontmatter is empty';
  const words = job.trim().split(/\s+/).length;
  if (words > maxWords) return `the \`job\` line is ${words} words, over the ${maxWords} allowed`;
  if (/[.!?]["')\]]?\s+\p{Lu}/u.test(job.trim())) return 'the `job` line is more than one sentence';
  return undefined;
}

/** The kinds a page's entry lets it be: its own `kind`, the ones it lists, and `reference` for a limit with no kind. */
function allowedKinds(entry: Entry | undefined): string[] {
  if (!entry) return [];
  const kinds = [...(entry.kind ? [entry.kind] : []), ...(entry.kinds ?? [])];
  if (entry.kind === undefined && entry.limit !== undefined) kinds.push('reference');
  return [...new Set(kinds)];
}

/** A page's kind and caps, or a message when nothing says. */
export function kindFor(
  file: string,
  fields: Record<string, unknown>,
  limits: Limits,
): { kind: string; caps: KindCaps; limit?: number } | string {
  const name = file.split('/').pop() ?? file;
  const own = limits.pages[file];
  const folder = Object.keys(limits.folders)
    .filter((candidate) => file.startsWith(`${candidate}/`))
    .sort((a, b) => b.length - a.length)[0];
  const entry = own ?? (folder ? limits.folders[folder] : undefined);

  const declared = fields.kind;
  if (declared !== undefined && (typeof declared !== 'string' || !(declared in limits.kinds))) {
    return `${file}: \`kind: ${String(declared)}\` in the frontmatter is not a kind (${Object.keys(limits.kinds).join(', ')}).`;
  }
  if (declared !== undefined && own?.kind !== undefined && own.kind !== declared) {
    return `${file}: the frontmatter says kind ${String(declared)} and "pages" in page-limits.json says ${own.kind}. Keep one.`;
  }
  if (name.startsWith('fix-') && declared !== undefined && declared !== 'fix') {
    return `${file}: a file named fix-* is a fix page, and the frontmatter says kind ${String(declared)}.`;
  }

  const kind = name.startsWith('fix-') ? 'fix' : (declared as string | undefined) ?? entry?.kind ?? (entry?.limit === undefined ? undefined : 'reference');
  if (kind === undefined) {
    return `${file} has no kind. Name it in the frontmatter (kind: ...), or add the page or its folder to page-limits.json, or name a fix page fix-*.`;
  }
  const caps = limits.kinds[kind];
  if (!caps) return `${file}: "${kind}" in page-limits.json is not a kind.`;

  const allowed = allowedKinds(entry);
  if (!allowed.includes(kind)) {
    const why = !entry
      ? 'page-limits.json has no entry for the page or its folder, so it has no kind it may take. Add its folder to "folders"'
      : `${own ? 'its entry in "pages"' : `its folder "${folder}"`} in page-limits.json allows only ${allowed.join(', ') || 'no kind'}. Write the page as one of those`;
    return `${file} is a ${kind} page, and ${why}.`;
  }

  const limit = entry?.limit;
  if (limit !== undefined) {
    if (!entry?.reason) return `${file}: the limit of ${limit} words in page-limits.json has no reason.`;
    if (caps.words !== undefined && limit <= caps.words) {
      return `${file}: the limit of ${limit} words in page-limits.json does not exceed the ${caps.words} a ${kind} gets. Remove the entry.`;
    }
  } else if (caps.words === undefined) {
    return `${file}: a ${kind} page needs its own limit and reason in page-limits.json.`;
  }
  return { kind, caps, limit };
}

export interface Page {
  file: string;
  text: string;
}

export interface Evaluated {
  kind: string;
  measured: Measured;
  values: Record<Measure, number>;
  /** The most each measure may be; a measure the kind has no cap for is absent. */
  allowed: Partial<Record<Measure, number>>;
  /** Whether the page is a Start page, which has a lower cap on Terminal length. */
  start: boolean;
  job: unknown;
}

/** A page's measures against its caps, or the message that says why it has none. */
export function evaluate(file: string, text: string, limits: Limits): Evaluated | string {
  const { fields, body } = splitPage(text);
  const found = kindFor(file, fields, limits);
  if (typeof found === 'string') return found;
  const { kind, caps, limit } = found;
  const measured = measure(body);
  const start = file.startsWith('(start)/');
  return {
    kind,
    measured,
    start,
    job: fields.job,
    values: {
      words: measured.words,
      codeBlocks: measured.codeBlocks,
      h2: measured.h2,
      terminalLines: measured.terminalLines,
      entries: measured.entries.length,
      entryWords: Math.max(0, ...measured.entries.map((entry) => entry.words)),
      entryCodeBlocks: measured.entryCodeBlocks,
      fenceLines: measured.fenceLines,
      textFenceLines: measured.textFenceLines,
    },
    allowed: {
      words: limit ?? caps.words,
      codeBlocks: caps.codeBlocks,
      h2: caps.h2,
      terminalLines: start ? limits.startTerminalLines : limits.terminalLines,
      entries: caps.entries,
      entryWords: caps.entryWords,
      entryCodeBlocks: caps.entryCodeBlocks,
      fenceLines: caps.fenceLines,
      textFenceLines: caps.textFenceLines,
    },
  };
}

/** What is wrong with a frontmatter `title` or `description`, which a reader reads, or nothing. */
function lineProblem(name: string, value: unknown, maxWords: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const words = wordsOf(value);
  return words > maxWords ? `the \`${name}\` in the frontmatter is ${words} words, over the ${maxWords} allowed. A reader reads it as the page's first line, so it is not a place for prose` : undefined;
}

/**
 * What is wrong with the pages, one message each, naming the page and the
 * rule. An empty list means every page is within its caps, or exactly at the
 * ceilings of its pending entry.
 */
export function checkPages(pages: Page[], limits: Limits): string[] {
  const problems: string[] = [];
  const files = new Set(pages.map((page) => page.file));

  for (const { file, text } of pages) {
    const evaluated = evaluate(file, text, limits);
    if (typeof evaluated === 'string') {
      problems.push(evaluated);
      continue;
    }
    const { kind, measured, values, allowed, start, job } = evaluated;
    const excuse: Pending | undefined = limits.pending[file];
    const { fields, body } = splitPage(text);

    for (const include of includesOf(body)) {
      if (!isGeneratedInclude(file, include)) {
        problems.push(
          `${file}: <include> of ${include.file || 'nothing'} is not a file under src/generated/, so the words it brings would not be counted. Write the text on the page, or generate the file.`,
        );
      }
    }
    for (const [name, max] of [['title', limits.titleWords], ['description', limits.descriptionWords]] as const) {
      const bad = lineProblem(name, fields[name], max);
      if (bad) problems.push(`${file}: ${bad}.`);
    }

    for (const measure of MEASURES) {
      const cap = allowed[measure];
      const ceiling = excuse?.[measure];
      const rule = RULES[measure];
      if (cap === undefined) {
        if (ceiling !== undefined) problems.push(`${file}: a ${kind} page has no cap on ${rule.what}. Remove "${measure}" from its "pending" entry in page-limits.json.`);
        continue;
      }
      const where = start && measure === 'terminalLines' ? 'on a Start page' : `on a ${kind}`;
      const value = values[measure];
      if (value <= cap) {
        if (ceiling !== undefined) {
          problems.push(`${file} has ${value} ${rule.what}, within the ${cap} allowed. Remove "${measure}" from its "pending" entry in page-limits.json.`);
        }
        continue;
      }
      const worst = measure === 'entryWords' ? measured.entries.find((entry) => entry.words === value) : undefined;
      const entry = worst ? ` (the entry "${worst.heading}")` : '';
      if (ceiling === undefined) {
        problems.push(`${file}: ${value} ${rule.what}${entry}, over the ${cap} allowed ${where}. ${rule.fix}`);
      } else if (value > ceiling) {
        problems.push(
          `${file}: ${value} ${rule.what}${entry}, over its pending ceiling of ${ceiling}. A pending page may not grow while it waits for its rewrite, and ${cap} are allowed ${where}. ${rule.fix}`,
        );
      } else if (value < ceiling) {
        problems.push(
          `${file}: ${value} ${rule.what}${entry}, under its pending ceiling of ${ceiling}, so the page could grow back to it. Lower "${measure}" in its "pending" entry in page-limits.json to ${value}, or remove it once the page meets the ${cap} allowed ${where}.`,
        );
      }
    }

    if (job === undefined) {
      if (!excuse?.missingJob) problems.push(`${file}: no \`job\` line in the frontmatter. Say in one sentence, up to ${limits.jobWords} words, who the reader is and what they leave able to do.`);
    } else {
      const bad = jobProblem(job, limits.jobWords);
      if (bad) problems.push(`${file}: ${bad}.`);
      else if (excuse?.missingJob) problems.push(`${file} has a \`job\` line. Remove "missingJob" from its "pending" entry in page-limits.json.`);
    }
  }

  for (const [file, excuse] of Object.entries(limits.pending)) {
    if (!files.has(file)) {
      problems.push(`"pending" in page-limits.json names ${file}, which is not a page. Remove the entry.`);
      continue;
    }
    if (!excuse.reason) problems.push(`The "pending" entry for ${file} has no reason.`);
    const known = new Set<string>([...MEASURES, 'reason', 'missingJob']);
    for (const key of Object.keys(excuse)) {
      if (!known.has(key)) problems.push(`The "pending" entry for ${file} has "${key}", which is not a measure.`);
    }
    if (!MEASURES.some((measure) => excuse[measure] !== undefined) && !excuse.missingJob) {
      problems.push(`The "pending" entry for ${file} excuses nothing. Remove it.`);
    }
  }
  for (const file of Object.keys(limits.pages)) {
    if (!files.has(file)) problems.push(`"pages" in page-limits.json names ${file}, which is not a page. Remove the entry.`);
  }
  for (const folder of Object.keys(limits.folders)) {
    if (![...files].some((file) => file.startsWith(`${folder}/`))) {
      problems.push(`"folders" in page-limits.json names ${folder}, which holds no page. Remove the entry.`);
    }
  }
  return problems;
}
