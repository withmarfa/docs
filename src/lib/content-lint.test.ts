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

const CONTENT_DIR = fileURLToPath(new URL('../../content/docs', import.meta.url));
const GLOSSARY_PATH = fileURLToPath(new URL('../generated/GLOSSARY.md', import.meta.url));

type Rule =
  | 'em-dash'
  | 'banned-term'
  | 'avoided-term'
  | 'statement-number'
  | 'frontmatter'
  | 'coming-soon'
  | 'link';

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

/**
 * The page with fenced code blocks and inline code replaced by spaces. Every
 * offset and line number is unchanged, so a match in the result points at the
 * same place in the source.
 */
export function stripCode(text: string): string {
  const lines = text.split('\n');
  let fence: { char: string; length: number } | null = null;
  const withoutFences = lines.map((line) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      if (marker) {
        fence = { char: marker[1][0], length: marker[1].length };
        return blank(line);
      }
      return line;
    }
    if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length) {
      fence = null;
    }
    return blank(line);
  });
  // Inline code stays within one line, so a stray backtick cannot blank the
  // text that follows it.
  return withoutFences
    .map((line) => line.replace(/(`+)(?!`)(.*?)(?<!`)\1(?!`)/g, blank))
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
const COMING_SOON_ALLOWED = new Set(['get-started/index.mdx', 'get-started/run-an-instance.mdx']);

export function checkComingSoon(file: string, text: string): Violation[] {
  if (COMING_SOON_ALLOWED.has(file)) return [];
  const out: Violation[] = [];
  for (const match of text.matchAll(/coming soon/gi)) {
    out.push({
      file,
      line: lineOf(text, match.index),
      rule: 'coming-soon',
      detail: '"coming soon" is allowed only on the two pages that open Get started',
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
        fail(`${dest} is a relative link; use a path from the site root, such as /get-started/files`);
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

function lintAll(check: (file: string, text: string) => Violation[]): string[] {
  return FILES.flatMap(({ file, text }) => check(file, text)).map(format);
}

// ── Tests over the real pages ────────────────────────────────────────────

describe('content lint: the corpus', () => {
  it('finds the pages and the glossary it lints against', () => {
    expect(FILES.length).toBeGreaterThan(10);
    expect(BANNED.length).toBeGreaterThan(0);
    expect(PAGE_URLS.has('/get-started')).toBe(true);
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
    expect(checkComingSoon('get-started/index.mdx', 'Coming soon.')).toEqual([]);
    expect(checkComingSoon('get-started/run-an-instance.mdx', 'Coming soon.')).toEqual([]);
  });

  describe('link', () => {
    const urls = new Set(['/get-started', '/api-reference/items/createItem']);

    it('fires on a link that reaches no page', () => {
      const found = checkLinks('x.mdx', 'Ok.\nSee [it](/learn/files).', urls);
      expect(rules(found)).toEqual(['link']);
      expect(found[0].line).toBe(2);
      expect(rules(checkLinks('x.mdx', '<Card href="/nowhere" />', urls))).toEqual(['link']);
    });

    it('accepts pages, anchors, generated pages and the .md copy', () => {
      const text = [
        '[a](/get-started)',
        '[b](/get-started#heading)',
        '[c](/api-reference/items/createItem)',
        '[d](/get-started.md)',
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
      for (const dest of ['https://docs.marfa.so/get-started', 'http://docs.marfa.so', 'https://docs.marfa.so/x#y']) {
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
