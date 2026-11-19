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
 * - Prose is what a reader reads: paragraphs, headings, lists, hand-written
 *   tables and inline code. It leaves out the frontmatter, fenced code blocks
 *   (a command, its sample output and every other block), the markup of MDX
 *   components and their attributes, comments, images, link addresses, and
 *   every `<include>`. An include shows a file from `src/generated/`, so a
 *   generated table never counts.
 * - A code block is one fence. A `Terminal` is one block, and so are
 *   consecutive fences that carry a `tab` (code tabs).
 * - Sample output is every fence in a `Terminal` after the first, which holds
 *   the command. Its length is its lines.
 *
 * How a page's kind is known, in this order:
 * 1. A file whose name starts with `fix-` is a fix page.
 * 2. Otherwise `kind` in the frontmatter, which must be a kind in the JSON.
 * 3. Otherwise the page's own entry under `pages`, then the entry of the
 *    longest folder that holds it. An entry with a `limit` and no kind is a
 *    reference page.
 * A page that none of these names fails, and so does one that two say
 * differently.
 */

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
}

/** What a page may exceed. Every limit above its kind's ceiling carries a reason. */
export interface Entry {
  kind?: string;
  limit?: number;
  reason?: string;
}

/** The measures a pending page's ceilings are named by. */
export type Measure = 'words' | 'codeBlocks' | 'h2' | 'terminalLines' | 'entries' | 'entryWords';

/** A page waiting for its rewrite: each measure it exceeds today, at its current value, and whether it lacks a job. */
export type Pending = Partial<Record<Measure, number>> & { reason: string; missingJob?: boolean };

export interface Limits {
  kinds: Record<string, KindCaps>;
  /** The most lines of sample output in one `Terminal`, and on a Start page. */
  terminalLines: number;
  startTerminalLines: number;
  jobWords: number;
  folders: Record<string, Entry>;
  pages: Record<string, Entry>;
  pending: Record<string, Pending>;
}

export const MEASURES: Measure[] = ['words', 'codeBlocks', 'h2', 'terminalLines', 'entries', 'entryWords'];

/** What a measure counts, as a message says it, and what to do when a page is over. */
const RULES: Record<Measure, { what: string; fix: string }> = {
  words: { what: 'prose words', fix: 'Cut it, move detail to the reference or another page, or split the page.' },
  codeBlocks: { what: 'code blocks', fix: 'Show only the code each step adds, or move the rest to the reference.' },
  h2: { what: 'H2 headings', fix: 'A page with this many sections does more than one job: split it.' },
  terminalLines: { what: 'lines of sample output in one Terminal', fix: 'Show only the lines that prove the command worked.' },
  entries: { what: 'entries', fix: 'Keep the messages a reader meets and link the rest to Errors.' },
  entryWords: { what: 'prose words in one entry', fix: 'Give the cause in one sentence and the fix in one step.' },
};

export interface Measured {
  words: number;
  codeBlocks: number;
  h2: number;
  /** The most lines of sample output in any one `Terminal`. */
  terminalLines: number;
  /** Every H2 and H3 with the prose words under it, up to the next heading. */
  entries: { heading: string; words: number }[];
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

/** Words in a run of prose: tokens with a letter or a digit, after links are cut to their text. */
export function wordsOf(text: string): number {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(/[\s|]+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Text without MDX markup. A tag inside inline code is code, so it stays. */
function stripMarkup(text: string): string {
  return text
    .replace(COMMENT, '')
    .replace(INCLUDE, '')
    .replace(/(`+)(?:(?!\1)[\s\S])*?\1|(<\/?[A-Za-z])/g, (match, ticks: string | undefined) => (ticks ? match : `\u0000${match}`))
    .replace(new RegExp(`\u0000(${TAG.source})`, 'g'), '')
    .replace(/\u0000/g, '');
}

interface Fence {
  info: string;
  lines: number;
  /** The number of the `Terminal` it is in, if any, and its place in it. */
  terminal?: { id: number; index: number };
  /** Whether prose stands between it and the fence before it. */
  afterProse: boolean;
}

/** The prose of a body with its code blocks left out, and the code blocks. */
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
      const fence: Fence = { info: marker[2].trim(), lines: 0, afterProse: proseSince };
      if (terminalId !== undefined) fence.terminal = { id: terminalId, index: inTerminal++ };
      fences.push(fence);
      open = { char: marker[1][0], length: marker[1].length, fence };
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
  return stripMarkup(scan(body).prose);
}

/** Measures a page's body. */
export function measure(body: string): Measured {
  const { prose, fences } = scan(body);
  const text = stripMarkup(prose);
  const lines = text.split('\n');

  const sections: { heading: string; lines: string[] }[] = [];
  let h2 = 0;
  let current: { heading: string; lines: string[] } | undefined;
  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      if (heading[1] === '##') h2++;
      current = heading[1].length === 2 || heading[1].length === 3 ? { heading: heading[2], lines: [] } : undefined;
      if (current) sections.push(current);
    } else {
      current?.lines.push(line);
    }
  }
  const entries = sections.map((section) => ({ heading: section.heading, words: wordsOf(section.lines.join('\n')) }));

  // Code blocks: a Terminal is one, and consecutive fences with a `tab` are one.
  let codeBlocks = 0;
  let previousTab = false;
  const terminalsSeen = new Set<number>();
  const output = new Map<number, number>();
  for (const fence of fences) {
    if (fence.terminal) {
      if (!terminalsSeen.has(fence.terminal.id)) {
        terminalsSeen.add(fence.terminal.id);
        codeBlocks++;
      }
      if (fence.terminal.index > 0) output.set(fence.terminal.id, (output.get(fence.terminal.id) ?? 0) + fence.lines);
      previousTab = false;
      continue;
    }
    const tab = /(?:^|\s)tab=/.test(fence.info);
    if (!(tab && previousTab && !fence.afterProse)) codeBlocks++;
    previousTab = tab;
  }

  return {
    words: wordsOf(text),
    codeBlocks,
    h2,
    terminalLines: Math.max(0, ...output.values()),
    entries,
  };
}

/** What is wrong with a job line, or nothing. An absent line is its own case. */
export function jobProblem(job: unknown, maxWords: number): string | undefined {
  if (typeof job !== 'string' || job.trim() === '') return 'the `job` line in the frontmatter is empty';
  const words = job.trim().split(/\s+/).length;
  if (words > maxWords) return `the \`job\` line is ${words} words, over the ${maxWords} allowed`;
  if (/[.!?]["')\]]?\s+\p{Lu}/u.test(job.trim())) return 'the `job` line is more than one sentence';
  return undefined;
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
  /** Whether the page is a Start page, which has a lower cap on sample output. */
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
    },
    allowed: {
      words: limit ?? caps.words,
      codeBlocks: caps.codeBlocks,
      h2: caps.h2,
      terminalLines: start ? limits.startTerminalLines : limits.terminalLines,
      entries: caps.entries,
      entryWords: caps.entryWords,
    },
  };
}

/**
 * What is wrong with the pages, one message each, naming the page and the
 * rule. An empty list means every page is within its caps, or at or under the
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

    for (const measure of MEASURES) {
      const cap = allowed[measure];
      if (cap === undefined) continue;
      const where = start && measure === 'terminalLines' ? 'on a Start page' : `on a ${kind}`;
      const value = values[measure];
      const ceiling = excuse?.[measure];
      const rule = RULES[measure];
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
