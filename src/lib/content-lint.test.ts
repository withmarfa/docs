/**
 * Lints every page under content/docs against the rules that a reader or a
 * review would otherwise have to catch by eye.
 *
 * Each rule is a function over one page's text that returns violations, and the
 * suite runs those same functions twice: over the real pages, and over a small
 * bad sample per rule (the witness tests). A rule that stops firing, because a
 * pattern broke or a parse came back empty, therefore fails a test instead of
 * passing everything.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { source } from '@/lib/source';

const ROOT_DIR = fileURLToPath(new URL('../..', import.meta.url));
const CONTENT_DIR = fileURLToPath(new URL('../../content/docs', import.meta.url));
const GLOSSARY_PATH = fileURLToPath(new URL('../generated/GLOSSARY.md', import.meta.url));

type Rule =
  | 'em-dash'
  | 'banned-term'
  | 'avoided-term'
  | 'statement-number'
  | 'frontmatter'
  | 'coming-soon'
  | 'link'
  | 'include';

interface Violation {
  file: string;
  line: number;
  rule: Rule;
  detail: string;
}

export function format(v: Violation): string {
  return `${v.file}:${v.line} [${v.rule}] ${v.detail}`;
}

// ── Text helpers ─────────────────────────────────────────────────────────

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function blank(s: string): string {
  return s.replace(/[^\n]/g, ' ');
}

/** Which lines are a code fence or inside one. */
function fenceMask(lines: string[]): boolean[] {
  let fence: { char: string; length: number } | null = null;
  return lines.map((line) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      if (marker) {
        fence = { char: marker[1][0], length: marker[1].length };
        return true;
      }
      return false;
    }
    if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length) {
      fence = null;
    }
    return true;
  });
}

/**
 * The page with fenced code blocks and inline code replaced by spaces. Every
 * offset and line number is unchanged, so a match in the result points at the
 * same place in the source.
 */
export function stripCode(text: string): string {
  const lines = text.split('\n');
  const fenced = fenceMask(lines);
  // Inline code stays within one line, so a stray backtick cannot blank the
  // text that follows it.
  return lines
    .map((line, index) =>
      fenced[index] ? blank(line) : line.replace(/(`+)(?!`)(.*?)(?<!`)\1(?!`)/g, blank),
    )
    .join('\n');
}

// ── Banned terms ─────────────────────────────────────────────────────────

/**
 * The banned terms, read from the "## Banned" table of the synced glossary. The
 * first cell of a row names the term in bold, sometimes with a qualifier after
 * it ("sync, as a program or product").
 */
export function parseBannedTerms(glossary: string): string[] {
  const section = /^## Banned\s*$/m.exec(glossary);
  if (!section) return [];
  const rest = glossary.slice(section.index + section[0].length);
  const end = rest.search(/^## /m);
  const body = end === -1 ? rest : rest.slice(0, end);

  const terms: string[] = [];
  for (const row of body.split('\n')) {
    if (!row.startsWith('|')) continue;
    const bold = /^\|\s*\*\*([^*]+)\*\*/.exec(row);
    if (bold) terms.push(bold[1].trim().toLowerCase());
  }
  return terms;
}

/**
 * Banned entries a machine cannot check, by name, with the reason. Matching
 * them anyway would flag correct prose.
 */
const NOT_MACHINE_CHECKABLE = new Map<string, string>([
  ['sync', 'only "sync" as a program or product is banned, and plain "sync" is an ordinary word'],
]);

/** Phrases that contain a banned word and are fine, by the term they contain. */
const ALLOWED_PHRASES = new Map<string, string[]>([['space', ['disk space']]]);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole words in prose, case-insensitively, with an optional plural ("space"
 * also catches "spaces"). Code is ignored.
 */
export function checkBannedTerms(file: string, text: string, terms: string[]): Violation[] {
  return findTerms(file, text, terms, 'banned-term', (match, term) => `"${match}" is banned by the glossary (${term})`);
}

/**
 * Terms the docs avoid but the glossary does not ban, because older contract
 * chapters still use them. Docs only: the contract owners have settled the term.
 */
const AVOIDED_IN_DOCS = ['door'];

export function checkAvoidedTerms(file: string, text: string, terms: string[]): Violation[] {
  return findTerms(file, text, terms, 'avoided-term', (match) => `"${match}" is avoided in the docs; say "operation" or name the thing`);
}

function findTerms(
  file: string,
  text: string,
  terms: string[],
  rule: Rule,
  detail: (match: string, term: string) => string,
): Violation[] {
  const prose = stripCode(text);
  const out: Violation[] = [];
  for (const term of terms) {
    if (NOT_MACHINE_CHECKABLE.has(term)) continue;
    let scanned = prose;
    for (const phrase of ALLOWED_PHRASES.get(term) ?? []) {
      scanned = scanned.replace(new RegExp(escapeRegExp(phrase), 'gi'), blank);
    }
    const pattern = new RegExp(`\\b${escapeRegExp(term)}s?\\b`, 'gi');
    for (const match of scanned.matchAll(pattern)) {
      out.push({
        file,
        line: lineOf(text, match.index),
        rule,
        detail: detail(match[0], term),
      });
    }
  }
  return out;
}

// ── The other rules ──────────────────────────────────────────────────────

// The character, and the same dash written as an HTML entity.
const EM_DASH = /\u2014|&mdash;|&#0*8212;|&#x0*2014;/gi;

export function checkEmDashes(file: string, text: string): Violation[] {
  const out: Violation[] = [];
  for (const match of text.matchAll(EM_DASH)) {
    out.push({
      file,
      line: lineOf(text, match.index),
      rule: 'em-dash',
      detail: 'em dash; use a comma, a colon or a full stop',
    });
  }
  return out;
}

// A cited statement of the contract: "items.md 5", "`events.md` 11", "statement 30".
const STATEMENT_NUMBER = /\b[\w-]+\.md`?\s+#?\d+\b|\bstatements?\s+#?\d+\b/gi;

export function checkStatementNumbers(file: string, text: string): Violation[] {
  const out: Violation[] = [];
  for (const match of text.matchAll(STATEMENT_NUMBER)) {
    out.push({
      file,
      line: lineOf(text, match.index),
      rule: 'statement-number',
      detail: `"${match[0]}" cites a contract statement number; say what the rule is instead`,
    });
  }
  return out;
}

export function checkFrontmatter(file: string, text: string): Violation[] {
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  const fail = (detail: string): Violation[] => [{ file, line: 1, rule: 'frontmatter', detail }];
  if (!block) return fail('no frontmatter block');

  let data: unknown;
  try {
    data = parseYaml(block[1]);
  } catch (error) {
    return fail(`frontmatter is not valid YAML: ${(error as Error).message.split('\n')[0]}`);
  }
  const fields = (data ?? {}) as Record<string, unknown>;
  const out: Violation[] = [];
  for (const key of ['title', 'description']) {
    const value = fields[key];
    if (typeof value !== 'string' || value.trim() === '') {
      out.push(...fail(`${key} is missing or empty`));
    }
  }
  return out;
}

/** Pages that may still say "coming soon", relative to content/docs. */
const COMING_SOON_ALLOWED = new Set(['(overview)/overview.mdx']);

export function checkComingSoon(file: string, text: string): Violation[] {
  if (COMING_SOON_ALLOWED.has(file)) return [];
  const out: Violation[] = [];
  for (const match of text.matchAll(/coming soon/gi)) {
    out.push({
      file,
      line: lineOf(text, match.index),
      rule: 'coming-soon',
      detail: '"coming soon" is allowed only on the Overview page',
    });
  }
  return out;
}

/** Routes that serve text rather than a docs page, and are fine to link to. */
const NON_PAGE_ROUTES = new Set(['/', '/llms.txt', '/llms-full.txt', '/docs-map.md', '/mcp']);

function normalizeLink(target: string): string {
  const bare = target.replace(/[?#].*$/, '').replace(/\/+$/, '');
  return bare === '' ? '/' : bare;
}

const LINK_PATTERNS = [
  // A Markdown link, not an image: the destination up to the first space or `)`.
  /(?<!!)\[[^\]\n]*\]\(\s*([^)\s]+)/g,
  /\bhref=["']([^"']*)["']/g,
];

/**
 * Every internal link is a path from the site root and reaches a page. A `.md`
 * copy of a page counts as that page. API reference pages are generated from
 * the API description, and they are part of the same source, so their URLs are
 * in the set like any other. A relative link, or an absolute link to this
 * site's own host, fails: neither resolves in the Markdown copy or on a
 * self-hosted instance. Links to other sites and in-page anchors are left alone.
 */
export function checkLinks(file: string, text: string, pageUrls: Set<string>): Violation[] {
  const prose = stripCode(text);
  const out: Violation[] = [];
  for (const pattern of LINK_PATTERNS) {
    for (const match of prose.matchAll(pattern)) {
      const dest = match[1];
      const fail = (detail: string) =>
        out.push({ file, line: lineOf(text, match.index), rule: 'link', detail });

      if (/^https?:\/\/docs\.marfa\.so(?:[/?#]|$)/i.test(dest)) {
        fail(`${dest} is an absolute link to this site; use a path from the site root`);
      } else if (dest.startsWith('//') || dest.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(dest)) {
        continue;
      } else if (!dest.startsWith('/')) {
        fail(`${dest} is a relative link; use a path from the site root, such as /files`);
      } else {
        const target = normalizeLink(dest);
        const page = target.replace(/\.md$/, '');
        if (!NON_PAGE_ROUTES.has(target) && !pageUrls.has(target) && !pageUrls.has(page)) {
          fail(`${dest} does not reach a page`);
        }
      }
    }
  }
  return out;
}

// ── Included text ────────────────────────────────────────────────────────

/**
 * Text a page pulls in with `<include>`, which reaches readers as the page's
 * own prose but is not in the page's source.
 *
 * `file` names where the text lives and which page includes it. `text` is the
 * included file with everything outside the included part blanked, so a line
 * number in it is the line in the included file.
 */
export interface Included {
  file: string;
  text: string;
}

const INCLUDE_TAG = /<include\b([^>]*)>([\s\S]*?)<\/include>/g;

/** A heading's id as fumadocs-mdx gives it: GitHub's slug, or a trailing `[#id]`. */
function headingIds(lines: string[], fenced: boolean[]): Map<number, string> {
  const ids = new Map<number, string>();
  const used = new Map<string, number>();
  lines.forEach((line, index) => {
    const heading = fenced[index] ? null : /^ {0,3}#{1,6}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    if (!heading) return;
    const custom = /\s*\[#([^\]\s]+)\]$/.exec(heading[1]);
    const words = (custom ? heading[1].slice(0, custom.index) : heading[1])
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*]/g, '');
    if (custom) {
      ids.set(index, custom[1]);
      return;
    }
    const slug = words
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-');
    const count = used.get(slug) ?? 0;
    used.set(slug, count + 1);
    ids.set(index, count === 0 ? slug : `${slug}-${count}`);
  });
  return ids;
}

/**
 * The part of an included file a page shows: all of it, or from the heading
 * with the given id to the next heading of any level. What is left out is
 * blanked, and the frontmatter is left out as fumadocs-mdx leaves it out.
 */
function includedPart(content: string, section: string | undefined): string | undefined {
  const lines = content.split('\n');
  const fenced = fenceMask(lines);
  let from = 0;
  let to = lines.length;
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(content);
  if (frontmatter) from = frontmatter[0].split('\n').length - 1;

  if (section !== undefined) {
    const ids = headingIds(lines, fenced);
    const start = [...ids].find(([, id]) => id === section)?.[0];
    if (start === undefined) return undefined;
    from = start;
    const next = [...ids.keys()].find((index) => index > start);
    if (next !== undefined) to = next;
  }
  return lines.map((line, index) => (index >= from && index < to ? line : blank(line))).join('\n');
}

/**
 * Every `<include>` on a page, and in what it includes, resolved as
 * fumadocs-mdx resolves it: the path is relative to the including file, or to
 * `cwd` with the `cwd` attribute, and `#id` picks one section. An include of
 * anything other than Markdown, or with `lang`, becomes a code block and holds
 * no prose. One that cannot be resolved is a violation, as it fails the build.
 */
export function resolveIncludes(
  page: string,
  pagePath: string,
  text: string,
  cwd: string,
  read: (absolutePath: string) => string | undefined,
  chain: readonly string[] = [pagePath],
): { included: Included[]; violations: Violation[] } {
  const included: Included[] = [];
  const violations: Violation[] = [];
  const fail = (index: number, detail: string) =>
    violations.push({ file: page, line: lineOf(text, index), rule: 'include', detail });

  for (const match of stripCode(text).matchAll(INCLUDE_TAG)) {
    const specifier = match[2].trim();
    if (specifier === '') continue;
    const hash = specifier.lastIndexOf('#');
    const file = hash === -1 ? specifier : specifier.slice(0, hash);
    const section = hash === -1 ? undefined : specifier.slice(hash + 1);
    const extension = path.extname(file);
    if (/\blang=/.test(match[1]) || (extension !== '.md' && extension !== '.mdx')) continue;

    const target = path.resolve(/\bcwd\b/.test(match[1]) ? cwd : path.dirname(pagePath), file);
    if (chain.includes(target)) {
      fail(match.index, `<include> of ${specifier} includes itself`);
      continue;
    }
    const content = read(target);
    if (content === undefined) {
      fail(match.index, `<include> cannot read ${specifier}`);
      continue;
    }
    const part = includedPart(content, section);
    if (part === undefined) {
      fail(match.index, `<include> finds no section "${section}" in ${file}`);
      continue;
    }

    const name = path.relative(cwd, target).split(path.sep).join('/');
    included.push({ file: `${name} (included by ${page})`, text: part });
    const nested = resolveIncludes(`${name} (included by ${page})`, target, part, cwd, read, [...chain, target]);
    included.push(...nested.included);
    violations.push(...nested.violations);
  }
  return { included, violations };
}

/**
 * The rules about what a reader sees, which is the same for included text as
 * for the page's own. The banned and avoided terms are not among them: the
 * glossary names those words in order to forbid them.
 */
export function checkIncluded(file: string, text: string, pageUrls: Set<string>): Violation[] {
  return [...checkEmDashes(file, text), ...checkLinks(file, text, pageUrls)];
}

// ── The corpus ───────────────────────────────────────────────────────────

function listPages(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.mdx'))
    .map((entry) => entry.split(path.sep).join('/'))
    .sort();
}

const BANNED = parseBannedTerms(readFileSync(GLOSSARY_PATH, 'utf8'));
const PAGE_URLS = new Set<string>(source.getPages().map((page) => page.url));
const FILES = listPages(CONTENT_DIR).map((file) => ({
  file,
  text: readFileSync(path.join(CONTENT_DIR, file), 'utf8'),
}));

function readIfPresent(absolutePath: string): string | undefined {
  try {
    return readFileSync(absolutePath, 'utf8');
  } catch {
    return undefined;
  }
}

const RESOLVED = FILES.map(({ file, text }) =>
  resolveIncludes(file, path.join(CONTENT_DIR, file), text, ROOT_DIR, readIfPresent),
);
const INCLUDED = RESOLVED.flatMap((resolved) => resolved.included);

function lintAll(check: (file: string, text: string) => Violation[]): string[] {
  return FILES.flatMap(({ file, text }) => check(file, text)).map(format);
}

/** The same rule over the text the pages include, never over the page's own. */
function lintIncluded(check: (file: string, text: string) => Violation[]): string[] {
  return INCLUDED.flatMap(({ file, text }) => check(file, text)).map(format);
}

// ── Tests over the real pages ────────────────────────────────────────────

describe('content lint: the corpus', () => {
  it('finds the pages and the glossary it lints against', () => {
    expect(FILES.length).toBeGreaterThan(10);
    expect(BANNED.length).toBeGreaterThan(0);
    expect(PAGE_URLS.has('/overview')).toBe(true);
    // Generated pages are in the set, so links into the API reference resolve.
    expect([...PAGE_URLS].some((url) => url.startsWith('/api-reference/') && url.split('/').length > 3)).toBe(true);
  });

  it('excludes only banned terms that the glossary still lists', () => {
    for (const term of NOT_MACHINE_CHECKABLE.keys()) expect(BANNED).toContain(term);
    for (const term of ALLOWED_PHRASES.keys()) expect(BANNED).toContain(term);
  });

  it('uses no em dashes', () => {
    expect(lintAll(checkEmDashes)).toEqual([]);
  });

  it('resolves every include to text it can read', () => {
    expect(RESOLVED.flatMap((resolved) => resolved.violations).map(format)).toEqual([]);
    const files = INCLUDED.map((included) => included.file);
    expect(files).toContain('src/generated/GLOSSARY.md (included by (overview)/glossary.mdx)');
    expect(files).toContain('src/generated/api-overview.md (included by api-reference/index.mdx)');
    for (const { text } of INCLUDED) expect(text.trim().length).toBeGreaterThan(0);
  });

  it('uses no em dashes in the text pages include', () => {
    expect(lintIncluded(checkEmDashes)).toEqual([]);
  });

  it('links only to pages that exist, in the text pages include', () => {
    expect(lintIncluded((file, text) => checkLinks(file, text, PAGE_URLS))).toEqual([]);
  });

  it('uses none of the glossary\'s banned terms', () => {
    expect(lintAll((file, text) => checkBannedTerms(file, text, BANNED))).toEqual([]);
  });

  it('uses none of the terms the docs avoid', () => {
    expect(lintAll((file, text) => checkAvoidedTerms(file, text, AVOIDED_IN_DOCS))).toEqual([]);
  });

  it('cites no contract statement numbers', () => {
    expect(lintAll(checkStatementNumbers)).toEqual([]);
  });

  it('gives every page a title and a description', () => {
    expect(lintAll(checkFrontmatter)).toEqual([]);
  });

  it('says "coming soon" only where it is allowed', () => {
    expect(lintAll(checkComingSoon)).toEqual([]);
  });

  it('links only to pages that exist', () => {
    expect(lintAll((file, text) => checkLinks(file, text, PAGE_URLS))).toEqual([]);
  });
});

// ── Witnesses: each rule fires on a small bad sample ─────────────────────

describe('content lint: each rule fires on a bad sample', () => {
  const rules = (violations: Violation[]) => violations.map((v) => v.rule);

  it('em-dash', () => {
    const found = checkEmDashes('x.mdx', 'One line.\nTwo — three.\n');
    expect(rules(found)).toEqual(['em-dash']);
    expect(found[0].line).toBe(2);
  });

  it('em-dash fires on the HTML entities too', () => {
    for (const entity of ['&mdash;', '&MDASH;', '&#8212;', '&#x2014;']) {
      expect(rules(checkEmDashes('x.mdx', `a ${entity} b`))).toEqual(['em-dash']);
    }
  });

  it('em-dash also fires inside code', () => {
    expect(rules(checkEmDashes('x.mdx', '```\na — b\n```\n'))).toEqual(['em-dash']);
  });

  it('banned-term parses the glossary table', () => {
    const glossary = [
      '## The words',
      '| **space** | not a banned row |',
      '## Banned',
      '',
      '| Banned | Say instead |',
      '| --- | --- |',
      '| **integration** | **connector** |',
      '| **sync**, as a program or product | **folders** |',
      '',
      '## Permissions',
      '| **items.purge** | not banned |',
    ].join('\n');
    expect(parseBannedTerms(glossary)).toEqual(['integration', 'sync']);
  });

  it('banned-term', () => {
    const found = checkBannedTerms('x.mdx', 'Fine.\nA new Integration runs.\n', ['integration']);
    expect(rules(found)).toEqual(['banned-term']);
    expect(found[0].line).toBe(2);
  });

  it('banned-term matches plurals and a phrase, not a longer word', () => {
    expect(rules(checkBannedTerms('x.mdx', 'Two spaces.', ['space']))).toEqual(['banned-term']);
    expect(rules(checkBannedTerms('x.mdx', 'The hosted mode.', ['hosted mode']))).toEqual(['banned-term']);
    expect(checkBannedTerms('x.mdx', 'A namespace and a workspace.', ['space'])).toEqual([]);
  });

  it('banned-term bans the British spelling', () => {
    expect(rules(checkBannedTerms('x.mdx', 'The job was cancelled.', ['cancelled']))).toEqual(['banned-term']);
    expect(checkBannedTerms('x.mdx', 'The job was canceled.', ['cancelled'])).toEqual([]);
  });

  it('banned-term ignores code, disk space and the entries it cannot check', () => {
    const text = 'Use `integration` here.\n\n```\nintegration\n```\n\nNeeds disk space.\n\nKeep in sync.\n';
    expect(checkBannedTerms('x.mdx', text, ['integration', 'space', 'sync'])).toEqual([]);
  });

  it('banned-term still finds a second "space" beside "disk space"', () => {
    expect(rules(checkBannedTerms('x.mdx', 'Disk space, then a space.', ['space']))).toEqual(['banned-term']);
  });

  it('avoided-term', () => {
    const found = checkAvoidedTerms('x.mdx', 'Fine.\nThe first Door and two doors.\n', ['door']);
    expect(rules(found)).toEqual(['avoided-term', 'avoided-term']);
    expect(found[0].line).toBe(2);
  });

  it('avoided-term ignores code and longer words', () => {
    expect(checkAvoidedTerms('x.mdx', 'Use `door` and a doorway.\n\n```\ndoor\n```\n', ['door'])).toEqual([]);
  });

  it('statement-number', () => {
    expect(rules(checkStatementNumbers('x.mdx', 'See items.md 5 for it.'))).toEqual(['statement-number']);
    expect(rules(checkStatementNumbers('x.mdx', 'See `events.md` 11 for it.'))).toEqual(['statement-number']);
    expect(rules(checkStatementNumbers('x.mdx', 'This is statement 30.'))).toEqual(['statement-number']);
  });

  it('statement-number leaves ordinary prose alone', () => {
    expect(checkStatementNumbers('x.mdx', 'The .md copy has 3 sections. A statement is a rule.')).toEqual([]);
  });

  it('frontmatter', () => {
    expect(rules(checkFrontmatter('x.mdx', '# No block\n'))).toEqual(['frontmatter']);
    expect(rules(checkFrontmatter('x.mdx', '---\ntitle: A\n---\nBody\n'))).toEqual(['frontmatter']);
    expect(rules(checkFrontmatter('x.mdx', '---\ntitle: ""\ndescription: B\n---\n'))).toEqual(['frontmatter']);
    expect(rules(checkFrontmatter('x.mdx', '---\ntitle: A\ndescription: @bad\n---\n'))).toEqual(['frontmatter']);
    expect(checkFrontmatter('x.mdx', '---\ntitle: A\ndescription: B\n---\nBody\n')).toEqual([]);
  });

  it('coming-soon', () => {
    expect(rules(checkComingSoon('guides/x.mdx', 'This is Coming Soon.'))).toEqual(['coming-soon']);
    expect(checkComingSoon('(overview)/overview.mdx', 'Coming soon.')).toEqual([]);
    expect(rules(checkComingSoon('(overview)/run-an-instance.mdx', 'Coming soon.'))).toEqual(['coming-soon']);
  });

  describe('link', () => {
    const urls = new Set(['/overview', '/api-reference/items/createItem']);

    it('fires on a link that reaches no page', () => {
      const found = checkLinks('x.mdx', 'Ok.\nSee [it](/learn/files).', urls);
      expect(rules(found)).toEqual(['link']);
      expect(found[0].line).toBe(2);
      expect(rules(checkLinks('x.mdx', '<Card href="/nowhere" />', urls))).toEqual(['link']);
    });

    it('accepts pages, anchors, generated pages and the .md copy', () => {
      const text = [
        '[a](/overview)',
        '[b](/overview#heading)',
        '[c](/api-reference/items/createItem)',
        '[d](/overview.md)',
        '[e](/llms.txt)',
        '[f](https://example.com/learn)',
      ].join('\n');
      expect(checkLinks('x.mdx', text, urls)).toEqual([]);
    });

    it('fires on a relative link', () => {
      for (const dest of ['files', './files', '../guides/deploy', 'files.md']) {
        const found = checkLinks('x.mdx', `Ok.\nSee [it](${dest}).`, urls);
        expect(rules(found)).toEqual(['link']);
        expect(found[0].line).toBe(2);
      }
      expect(rules(checkLinks('x.mdx', '<Card href="./files" />', urls))).toEqual(['link']);
    });

    it('fires on an absolute link to this site', () => {
      for (const dest of ['https://docs.marfa.so/overview', 'http://docs.marfa.so', 'https://docs.marfa.so/x#y']) {
        expect(rules(checkLinks('x.mdx', `[a](${dest})`, urls))).toEqual(['link']);
      }
    });

    it('leaves other sites, anchors, mail and images alone', () => {
      const text = [
        '[a](https://example.com/files)',
        '[b](#heading)',
        '[c](mailto:a@example.com)',
        '![d](./diagram.png)',
        '[e](https://docs.marfa.so.example.com/x)',
      ].join('\n');
      expect(checkLinks('x.mdx', text, urls)).toEqual([]);
    });

    it('ignores links inside code', () => {
      expect(checkLinks('x.mdx', '`[a](/nowhere)`\n\n```\n[b](/nowhere)\n```\n', urls)).toEqual([]);
    });
  });

  describe('included text', () => {
    const urls = new Set(['/overview']);
    const cwd = '/repo';
    const files = new Map<string, string>([
      ['/repo/src/generated/rules.md', '# Rules\n\nIntro.\n\n## One\nFirst — dash.\n### Two\nSecond.\n## One\nThird.\n'],
      ['/repo/content/docs/guides/local.md', 'Local — text.\n'],
      ['/repo/src/generated/fenced.md', '## A\n```\n## B\n```\nIn A.\n## C\nIn C.\n'],
      ['/repo/src/generated/custom.md', '## Words [#custom-id]\nBody.\n## `Code` and [a link](/x)\nMore.\n'],
      ['/repo/src/generated/front.md', '---\ntitle: T — U\n---\nBody.\n'],
      ['/repo/src/generated/outer.md', 'Outer.\n<include>./inner.md</include>\n'],
      ['/repo/src/generated/inner.md', 'Inner — dash.\n'],
      ['/repo/src/generated/loop.md', '<include>./loop.md</include>\n'],
      ['/repo/src/generated/code.ts', 'export const x = 1; // —\n'],
    ]);
    const read = (absolutePath: string) => files.get(absolutePath);
    const resolve = (text: string, page = 'guides/page.mdx') =>
      resolveIncludes(page, `/repo/content/docs/${page}`, text, cwd, read);
    const lines = (included: Included[]) => included.map((i) => i.text.split('\n').map((l) => l.trim()));

    it('resolves a path from the site root with cwd and from the page without it', () => {
      const root = resolve('<include cwd>src/generated/rules.md</include>');
      expect(root.violations).toEqual([]);
      expect(root.included.map((i) => i.file)).toEqual(['src/generated/rules.md (included by guides/page.mdx)']);
      const local = resolve('<include>./local.md</include>');
      expect(local.violations).toEqual([]);
      expect(local.included[0].text).toBe('Local — text.\n');
      expect(rules(resolve('<include>src/generated/rules.md</include>').violations)).toEqual(['include']);
    });

    it('takes one section, to the next heading of any level, and keeps the file\'s line numbers', () => {
      const { included } = resolve('<include cwd>src/generated/rules.md#one</include>');
      expect(lines(included)[0].filter(Boolean)).toEqual(['## One', 'First — dash.']);
      const found = checkEmDashes(included[0].file, included[0].text);
      expect(found.map((v) => v.line)).toEqual([6]);
      // The next heading, at any level, ends it; a repeated heading gets a numbered id.
      expect(lines(resolve('<include cwd>src/generated/rules.md#two</include>').included)[0].filter(Boolean)).toEqual(['### Two', 'Second.']);
      expect(lines(resolve('<include cwd>src/generated/rules.md#one-1</include>').included)[0].filter(Boolean)).toEqual(['## One', 'Third.']);
    });

    it('does not take a "#" line inside a code fence for a heading', () => {
      const { included } = resolve('<include cwd>src/generated/fenced.md#a</include>');
      expect(included[0].text).toContain('In A.');
      expect(included[0].text).not.toContain('In C.');
    });

    it('finds a section by a custom id and by a heading with markup', () => {
      expect(resolve('<include cwd>src/generated/custom.md#custom-id</include>').included[0].text).toContain('Body.');
      expect(resolve('<include cwd>src/generated/custom.md#code-and-a-link</include>').included[0].text).toContain('More.');
    });

    it('leaves the frontmatter out', () => {
      const { included } = resolve('<include cwd>src/generated/front.md</include>');
      expect(checkEmDashes(included[0].file, included[0].text)).toEqual([]);
      expect(included[0].text).toContain('Body.');
    });

    it('follows an include inside an included file', () => {
      const { included, violations } = resolve('<include cwd>src/generated/outer.md</include>');
      expect(violations).toEqual([]);
      expect(included.map((i) => i.file)).toEqual([
        'src/generated/outer.md (included by guides/page.mdx)',
        'src/generated/inner.md (included by src/generated/outer.md (included by guides/page.mdx))',
      ]);
    });

    it('treats an include of code, or with lang, as no prose', () => {
      expect(resolve('<include cwd>src/generated/code.ts</include>')).toEqual({ included: [], violations: [] });
      expect(resolve('<include cwd lang="md">src/generated/rules.md</include>')).toEqual({ included: [], violations: [] });
    });

    it('ignores an include inside code', () => {
      expect(resolve('`<include cwd>x.md</include>`\n\n```\n<include cwd>y.md</include>\n```\n')).toEqual({ included: [], violations: [] });
    });

    it('include fires on a missing file, a missing section and an include of itself', () => {
      const missing = resolve('Ok.\n<include cwd>src/generated/none.md</include>');
      expect(rules(missing.violations)).toEqual(['include']);
      expect(missing.violations[0].line).toBe(2);
      expect(rules(resolve('<include cwd>src/generated/rules.md#nope</include>').violations)).toEqual(['include']);
      expect(rules(resolve('<include cwd>src/generated/loop.md</include>').violations)).toEqual(['include']);
    });

    it('an included file with an em dash fails', () => {
      const { included } = resolve('<include cwd>src/generated/rules.md</include>');
      const found = checkIncluded(included[0].file, included[0].text, urls);
      expect(rules(found)).toEqual(['em-dash']);
      expect(found[0].file).toBe('src/generated/rules.md (included by guides/page.mdx)');
      expect(found[0].line).toBe(6);
    });

    it('an included file with a bad internal link fails', () => {
      for (const link of ['[a](/nowhere)', '[a](files)', '[a](https://docs.marfa.so/overview)', '<a href="./x">a</a>']) {
        const found = checkIncluded('x.md (included by y.mdx)', `Ok.\nSee ${link}.\n`, urls);
        expect(rules(found)).toEqual(['link']);
        expect(found[0].line).toBe(2);
      }
      expect(checkIncluded('x.md', 'See [a](/overview) and [b](https://example.com).', urls)).toEqual([]);
    });

    it('an included file that names a banned or avoided term passes', () => {
      const text = 'Never "door". An integration, a space and a substrate are banned words.\n';
      expect(checkIncluded('x.md', text, urls)).toEqual([]);
      expect(rules(checkBannedTerms('x.md', text, ['integration']))).toEqual(['banned-term']);
    });
  });

  it('inline code stays within one line', () => {
    const text = 'It`s a stray tick.\nA banned integration here.\nThen `code` and more.\n';
    const found = checkBannedTerms('x.mdx', text, ['integration']);
    expect(rules(found)).toEqual(['banned-term']);
    expect(found[0].line).toBe(2);
    expect(stripCode('a `b` c ``d`e`` f')).toBe(`a ${' '.repeat(3)} c ${' '.repeat(7)} f`);
    expect(stripCode('x `y\nz` w')).toBe('x `y\nz` w');
  });

  it('failure messages name the file, the line and the rule', () => {
    const [violation] = checkEmDashes('guides/x.mdx', 'a\nb — c');
    expect(format(violation)).toMatch(/^guides\/x\.mdx:2 \[em-dash\] /);
  });
});
