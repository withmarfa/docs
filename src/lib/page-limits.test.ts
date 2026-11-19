/**
 * Holds every page to its kind (STYLE.md, "Page types"): a word ceiling, caps
 * on code blocks, sample output and headings, and a `job` line. The rules and
 * how a page is measured are in `page-limits.ts`; the numbers are in
 * `page-limits.json`. A page over a rule today is listed under "pending" with
 * its current numbers, which a rewrite removes and nothing may exceed.
 *
 * The suite runs the check over the real pages and over a bad sample for each
 * rule, so a rule that stops firing fails a test instead of passing everything.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import config from './page-limits.json';
import { checkPages, measure, proseText, splitPage, wordsOf, type Limits, type Page } from './page-limits';

const CONTENT_DIR = fileURLToPath(new URL('../../content/docs', import.meta.url));

function listPages(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith('.mdx'))
    .map((entry) => entry.split(path.sep).join('/'))
    .sort();
}

describe('page limits: the pages', () => {
  const pages: Page[] = listPages(CONTENT_DIR).map((file) => ({ file, text: readFileSync(path.join(CONTENT_DIR, file), 'utf8') }));

  it('finds the pages', () => {
    expect(pages.length).toBeGreaterThan(50);
    expect(pages.every((page) => measure(splitPage(page.text).body).words > 0 || page.file.includes('catalog'))).toBe(true);
  });

  it('keeps every page within its kind, or at or under its pending ceilings while a rewrite waits', () => {
    expect(checkPages(pages, config as Limits)).toEqual([]);
  });

  it('leaves no MDX markup in the prose it counts', () => {
    const leaks = pages.flatMap(({ file, text }) => {
      const prose = proseText(splitPage(text).body).replace(/(`+)(?:(?!\1)[\s\S])*?\1/g, '');
      return [...prose.matchAll(/<\/?[A-Za-z][^\n]{0,40}/g)].map((match) => `${file}: ${match[0]}`);
    });
    expect(leaks).toEqual([]);
  });
});

describe('page limits: how a page is measured', () => {
  const body = (text: string) => measure(splitPage(text).body);

  it('counts prose words only: no frontmatter, code, markup, includes, comments, link addresses or bare punctuation', () => {
    expect(body('---\ntitle: A title\njob: Ignored words here.\n---\n\nOne two\n\n```bash\nthree four\n```\n').words).toBe(2);
    expect(body('Read [the guide](/use/a-long-address) now.').words).toBe(4);
    expect(body('| Name | Use |\n| --- | --- |\n| `a` | b c |\n').words).toBe(5);
    expect(body('- one\n- two\n\n## Three four\n').words).toBe(4);
    expect(body('<Callout type="warn" title="Hidden title here">\nBody words.\n</Callout>\n').words).toBe(2);
    expect(body('<Card\n  title="Multi line"\n  href="/x"\n>\nInside text.\n</Card>').words).toBe(2);
    expect(body('<include cwd>src/generated/cli/commands.md</include>\n\nOne.').words).toBe(1);
    expect(body('{/* a comment */}\n\n<!-- another one -->\n\nKept.').words).toBe(1);
    expect(body('Run `marfa <id> --now` to go.').words).toBe(6);
    expect(wordsOf('a  b\tc\n\nd')).toBe(4);
  });

  it('counts a Terminal and a run of code tabs as one code block each, and other fences one each', () => {
    const terminal = '<Terminal>\n```bash\nmarfa x\n```\n\n```text\nout\n```\n</Terminal>\n';
    const tabs = '```bash tab="CLI"\na\n```\n\n```ts tab="TypeScript"\nb\n```\n';
    expect(body(terminal).codeBlocks).toBe(1);
    expect(body(tabs).codeBlocks).toBe(1);
    expect(body(`${tabs}\nSome prose between.\n\n${tabs}`).codeBlocks).toBe(2);
    expect(body('```json\n{}\n```\n\n```json\n{}\n```\n').codeBlocks).toBe(2);
    expect(body('```http title="Request"\nGET /x\n```\n\n```json title="Response"\n{}\n```\n').codeBlocks).toBe(2);
    expect(body('````md\n```ts\nx\n```\n````\n').codeBlocks).toBe(1);
  });

  it('counts the lines of output in a Terminal, not its command, and takes the longest', () => {
    const one = '<Terminal>\n```bash\nmarfa a\nmarfa b\n```\n\n```text\n1\n2\n3\n```\n</Terminal>\n';
    const two = '<Terminal>\n```bash\nmarfa c\n```\n\n```text\n1\n2\n```\n</Terminal>\n';
    expect(body(one).terminalLines).toBe(3);
    expect(body(`${one}\n${two}`).terminalLines).toBe(3);
    expect(body('```text\n1\n2\n3\n```\n').terminalLines).toBe(0);
  });

  it('counts H2 headings outside code, and each H2 and H3 as an entry with the prose under it', () => {
    const measured = body('# Title\n\n## One\n\nFirst entry words.\n\n```md\n## Not a heading\n```\n\n### Two\n\nSecond.\n\n#### Deeper\n\nHidden from entries.\n\n## Three\n');
    expect(measured.h2).toBe(2);
    expect(measured.entries).toEqual([
      { heading: 'One', words: 3 },
      { heading: 'Two', words: 1 },
      { heading: 'Three', words: 0 },
    ]);
  });
});

describe('page limits: each rule fires on a bad sample', () => {
  const limits: Limits = {
    kinds: {
      concept: { words: 10, h2: 2 },
      'how-to': { words: 20, codeBlocks: 2, h2: 3 },
      tutorial: { words: 30, codeBlocks: 3 },
      fix: { words: 40, entries: 2, entryWords: 6 },
      reference: {},
    },
    terminalLines: 3,
    startTerminalLines: 1,
    jobWords: 8,
    folders: { a: { kind: 'concept' }, b: { kind: 'how-to' }, 'b/ref': { limit: 5, reason: 'Lookup.' }, '(start)': { kind: 'concept' } },
    pages: { 'a/long.mdx': { kind: 'concept', limit: 30, reason: 'Takes in a second idea.' }, 'a/lookup.mdx': { limit: 30, reason: 'Lookup.' } },
    pending: {},
  };
  const JOB = 'Someone learns one thing.';
  const page = (file: string, body: string, front = `job: ${JOB}`): Page => ({ file, text: `---\ntitle: T\n${front}\n---\n\n${body}\n` });
  const prose = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
  /** Pages that keep each sample entry in use, so only the check under test fires. */
  const anchors = [
    page('a/long.mdx', 'x'),
    page('a/lookup.mdx', 'x'),
    page('b/ref/y.mdx', 'x'),
    page('b/x.mdx', 'x'),
    page('(start)/s.mdx', 'x'),
  ];
  const run = (pages: Page[], over: Partial<Limits> = {}) => {
    const names = new Set(pages.map((p) => p.file));
    return checkPages([...pages, ...anchors.filter((p) => !names.has(p.file))], { ...limits, ...over });
  };

  it('passes a page within every rule', () => {
    expect(run([page('b/p.mdx', `## One\n\n${prose(5)}\n\n\`\`\`sh\na\n\`\`\``)])).toEqual([]);
  });

  it('fails a page over its kind\'s word ceiling, naming the page, the count, the ceiling and what to do', () => {
    const [message, ...rest] = run([page('a/p.mdx', prose(11))]);
    expect(rest).toEqual([]);
    expect(message).toContain('a/p.mdx');
    expect(message).toContain('11 prose words');
    expect(message).toContain('over the 10 allowed on a concept');
    expect(message).toContain('split the page');
    expect(run([page('a/p.mdx', prose(10))])).toEqual([]);
  });

  it('takes a page\'s own limit over its kind\'s, and its own entry over its folder\'s', () => {
    expect(run([page('a/long.mdx', prose(30))])).toEqual([]);
    expect(run([page('a/long.mdx', prose(31))])[0]).toContain('over the 30 allowed on a concept');
    expect(run([page('b/ref/z.mdx', prose(6))])[0]).toContain('over the 5 allowed on a reference');
  });

  it('fails too many code blocks on a how-to and a tutorial, and none on a concept', () => {
    const blocks = (n: number) => Array.from({ length: n }, () => '```sh\na\n```').join('\n\n');
    const [message] = run([page('b/p.mdx', blocks(3))]);
    expect(message).toContain('b/p.mdx');
    expect(message).toContain('3 code blocks, over the 2 allowed on a how-to');
    expect(run([page('b/p.mdx', blocks(2))])).toEqual([]);
    expect(run([page('a/p.mdx', blocks(9))])).toEqual([]);
    expect(run([page('b/p.mdx', blocks(3))], { folders: { ...limits.folders, b: { kind: 'tutorial' } } })).toEqual([]);
    expect(run([page('b/p.mdx', blocks(4))], { folders: { ...limits.folders, b: { kind: 'tutorial' } } })[0]).toContain('4 code blocks, over the 3 allowed on a tutorial');
  });

  it('fails too many H2 headings on a how-to and a concept', () => {
    expect(run([page('b/p.mdx', '## 1\n\n## 2\n\n## 3\n\n## 4')])[0]).toContain('4 H2 headings, over the 3 allowed on a how-to');
    expect(run([page('a/p.mdx', '## 1\n\n## 2\n\n## 3')])[0]).toContain('3 H2 headings, over the 2 allowed on a concept');
    expect(run([page('b/p.mdx', '## 1\n\n### a\n\n### b\n\n### c\n\n### d')])).toEqual([]);
  });

  it('fails a long Terminal, and a lower cap on a Start page', () => {
    const terminal = (lines: number) => `<Terminal>\n\`\`\`sh\nmarfa x\n\`\`\`\n\n\`\`\`text\n${Array(lines).fill('out').join('\n')}\n\`\`\`\n</Terminal>`;
    expect(run([page('b/p.mdx', terminal(3))])).toEqual([]);
    expect(run([page('b/p.mdx', terminal(4))])[0]).toContain('4 lines of sample output in one Terminal, over the 3 allowed on a how-to');
    expect(run([page('(start)/s.mdx', terminal(1))])).toEqual([]);
    expect(run([page('(start)/s.mdx', terminal(2))])[0]).toContain('over the 1 allowed on a Start page');
  });

  it('fails a fix page with too many entries or an entry that runs long, naming the entry', () => {
    const entry = (heading: string, n: number) => `## ${heading}\n\n${prose(n)}`;
    expect(run([page('b/fix-it.mdx', `${entry('A', 6)}\n\n${entry('B', 6)}`)])).toEqual([]);
    const [long] = run([page('b/fix-it.mdx', entry('The message the reader sees', 7))]);
    expect(long).toContain('b/fix-it.mdx');
    expect(long).toContain('7 prose words in one entry (the entry "The message the reader sees"), over the 6 allowed on a fix');
    expect(run([page('b/fix-it.mdx', '## A\n\n## B\n\n## C')])[0]).toContain('3 entries, over the 2 allowed on a fix');
    expect(run([page('b/other.mdx', 'x', 'kind: fix\njob: ' + JOB)])).toEqual([]);
  });

  it('fails a page with no job line, an empty one, a long one and one of two sentences', () => {
    expect(run([page('b/p.mdx', 'x', '')])[0]).toMatch(/b\/p\.mdx: no `job` line/);
    expect(run([page('b/p.mdx', 'x', 'job: ""')])[0]).toContain('the `job` line in the frontmatter is empty');
    expect(run([page('b/p.mdx', 'x', 'job: One two three four five six seven eight nine.')])[0]).toContain('9 words, over the 8 allowed');
    expect(run([page('b/p.mdx', 'x', 'job: Learn a thing. Then do it.')])[0]).toContain('more than one sentence');
  });

  it('knows a page\'s kind from its file name, its frontmatter, its own entry or its folder, and fails when none or two say', () => {
    expect(run([page('c/p.mdx', 'x')])[0]).toContain('has no kind');
    expect(run([page('c/fix-p.mdx', 'x')])).toEqual([]);
    expect(run([page('c/p.mdx', 'x', `kind: how-to\njob: ${JOB}`)])).toEqual([]);
    expect(run([page('c/p.mdx', prose(11), `kind: concept\njob: ${JOB}`)])[0]).toContain('allowed on a concept');
    expect(run([page('c/p.mdx', 'x', `kind: essay\njob: ${JOB}`)])[0]).toContain('`kind: essay`');
    expect(run([page('c/fix-p.mdx', 'x', `kind: concept\njob: ${JOB}`)])[0]).toContain('a file named fix-* is a fix page');
    expect(run([page('a/long.mdx', 'x', `kind: how-to\njob: ${JOB}`)])[0]).toContain('Keep one');
    expect(run([page('c/p.mdx', 'x', `kind: reference\njob: ${JOB}`)])[0]).toContain('needs its own limit and reason');
  });

  it('fails a limit with no reason, and one that does not exceed its kind\'s ceiling', () => {
    const pages = { ...limits.pages, 'a/p.mdx': { kind: 'concept', limit: 40 } };
    expect(run([page('a/p.mdx', 'x')], { pages })[0]).toContain('has no reason');
    const same = { ...limits.pages, 'a/p.mdx': { kind: 'concept', limit: 10, reason: 'No need.' } };
    expect(run([page('a/p.mdx', 'x')], { pages: same })[0]).toContain('does not exceed the 10 a concept gets');
    const unknown = { ...limits.pages, 'a/p.mdx': { kind: 'essay' } };
    expect(run([page('a/p.mdx', 'x')], { pages: unknown })[0]).toContain('not a kind');
  });

  describe('pending', () => {
    const pending = { 'a/p.mdx': { reason: 'Waits for its rewrite.', words: 14, h2: 3, missingJob: true } };
    const heavy = (words: number, h2s: number) => page('a/p.mdx', `${Array.from({ length: h2s }, (_, i) => `## H${i}`).join('\n\n')}\n\n${prose(words)}`, '');

    it('lets a page stay at or under its ceilings, and lack a job', () => {
      expect(run([heavy(11, 3)], { pending })).toEqual([]);
    });

    it('fails a page that grows past a ceiling, naming the page, the rule and both numbers', () => {
      const [message, ...rest] = run([heavy(12, 3)], { pending });
      expect(rest).toEqual([]);
      expect(message).toContain('a/p.mdx');
      expect(message).toContain('15 prose words');
      expect(message).toContain('over its pending ceiling of 14');
      expect(message).toContain('may not grow');
      expect(run([heavy(10, 4)], { pending })[0]).toContain('4 H2 headings, over its pending ceiling of 3');
    });

    it('fails a page over a rule its entry does not list', () => {
      const only = { 'a/p.mdx': { reason: 'Waits.', words: 14, missingJob: true } };
      expect(run([heavy(11, 3)], { pending: only })[0]).toContain('3 H2 headings, over the 2 allowed on a concept');
    });

    it('fails an entry that no longer excuses a measure, a job, or anything at all', () => {
      expect(run([heavy(2, 3)], { pending })[0]).toContain('Remove "words" from its "pending" entry');
      const withJob = page('a/p.mdx', `## A\n\n## B\n\n## C\n\n${prose(11)}`);
      expect(run([withJob], { pending })[0]).toContain('Remove "missingJob"');
      const done = { 'a/p.mdx': { reason: 'Waits.', missingJob: true } };
      expect(run([page('a/p.mdx', 'x', `job: ${JOB}`)], { pending: done })[0]).toContain('Remove "missingJob"');
      expect(run([page('a/p.mdx', 'x', '')], { pending: { 'a/p.mdx': { reason: 'Waits.' } } })).toEqual(
        expect.arrayContaining([expect.stringContaining('excuses nothing')]),
      );
    });

    it('fails an entry with no reason, an unknown key, or no page', () => {
      expect(run([heavy(11, 3)], { pending: { 'a/p.mdx': { ...pending['a/p.mdx'], reason: '' } } })[0]).toContain('has no reason');
      expect(run([heavy(11, 3)], { pending: { 'a/p.mdx': { ...pending['a/p.mdx'], lines: 3 } as never } })[0]).toContain('"lines", which is not a measure');
      expect(run([page('a/q.mdx', 'x')], { pending })[0]).toContain('not a page');
    });
  });

  it('fails a page or folder entry for something that is gone', () => {
    expect(run([page('a/q.mdx', 'x')], { pages: { ...limits.pages, 'a/gone.mdx': { kind: 'concept' } } })[0]).toContain('not a page');
    expect(run([page('a/q.mdx', 'x')], { folders: { ...limits.folders, gone: { kind: 'concept' } } })[0]).toContain('holds no page');
  });
});
