import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  diffContract,
  diffOperations,
  findStale,
  fingerprintOperations,
  isContractIndex,
  renderReport,
  scanCitations,
  type Comparison,
  type ContractIndex,
} from '../../scripts/staleness-report';

const SPEC = 'https://github.com/withmarfa/marfa/blob/main/conformance/spec';

const baseIndex: ContractIndex = {
  chapters: {
    blobs: { 'blobs/lend-earlier-version': 'aaa', 'blobs/upload-hash': 'bbb', 'blobs/gone': 'ccc' },
    items: { 'items/create': 'ddd' },
  },
};

describe('diffContract', () => {
  it('finds a changed hash, a removed rule and an added rule, by chapter', () => {
    const head: ContractIndex = {
      chapters: {
        blobs: { 'blobs/lend-earlier-version': 'CHANGED', 'blobs/upload-hash': 'bbb', 'blobs/new': 'eee' },
        items: { 'items/create': 'ddd' },
      },
    };
    const diff = diffContract(baseIndex, head);
    expect([...diff.changed]).toEqual(['blobs/lend-earlier-version']);
    expect([...diff.removed]).toEqual(['blobs/gone']);
    expect(diff.chapters.get('blobs')).toEqual({
      chapter: 'blobs',
      changed: ['blobs/lend-earlier-version'],
      removed: ['blobs/gone'],
      added: ['blobs/new'],
    });
    expect(diff.chapters.has('items')).toBe(false);
    expect(diff.known.get('blobs')?.has('blobs/gone')).toBe(true);
  });

  it('finds nothing when the indexes are the same', () => {
    const diff = diffContract(baseIndex, structuredClone(baseIndex));
    expect(diff.changed.size + diff.removed.size + diff.chapters.size).toBe(0);
  });

  it('counts a chapter that went away as removed rules', () => {
    const diff = diffContract(baseIndex, { chapters: { blobs: baseIndex.chapters.blobs } });
    expect([...diff.removed]).toEqual(['items/create']);
    expect(diff.chapters.get('items')?.removed).toEqual(['items/create']);
  });

  it('checks the shape of an index', () => {
    expect(isContractIndex(baseIndex)).toBe(true);
    expect(isContractIndex({ chapters: { blobs: { 'blobs/a': 1 } } })).toBe(false);
    expect(isContractIndex({})).toBe(false);
    expect(isContractIndex(null)).toBe(false);
  });
});

const spec = (overrides: { listItems?: object; itemProps?: object; path?: string } = {}) => ({
  paths: {
    [overrides.path ?? '/items']: {
      parameters: [{ $ref: '#/components/parameters/Store' }],
      get: {
        operationId: 'listItems',
        tags: ['Items'],
        responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Page' } } } } },
        ...overrides.listItems,
      },
      post: { operationId: 'createItem', responses: {} },
    },
    '/types': { get: { operationId: 'listTypes', responses: {} } },
  },
  components: {
    parameters: { Store: { name: 'store', in: 'query' } },
    schemas: {
      Page: { type: 'object', properties: { items: { type: 'array', items: { $ref: '#/components/schemas/Item' } } } },
      Item: { type: 'object', properties: { id: { type: 'string' }, ...overrides.itemProps }, extra: { $ref: '#/components/schemas/Item' } },
      Unrelated: { type: 'string' },
    },
  },
});

const diffSpecs = (a: unknown, b: unknown) =>
  diffOperations(fingerprintOperations(a), fingerprintOperations(b));

describe('diffOperations', () => {
  it('sees nothing in two equal descriptions, whatever the key order', () => {
    const reordered = JSON.parse(JSON.stringify(spec()));
    reordered.paths['/items'].get = Object.fromEntries(Object.entries(reordered.paths['/items'].get).reverse());
    const diff = diffSpecs(spec(), reordered);
    expect(diff.changed.size + diff.removed.size).toBe(0);
  });

  it('flags an operation whose own object changed, and no other', () => {
    const diff = diffSpecs(spec(), spec({ listItems: { summary: 'List all the items' } }));
    expect([...diff.changed]).toEqual(['listItems']);
  });

  it('flags an operation whose response schema changed through a reference, even a cyclic one', () => {
    const diff = diffSpecs(spec(), spec({ itemProps: { title: { type: 'string' } } }));
    expect([...diff.changed]).toEqual(['listItems']);
  });

  it('flags the operations of a path that moved', () => {
    const diff = diffSpecs(spec(), spec({ path: '/notes' }));
    expect([...diff.changed].sort()).toEqual(['createItem', 'listItems']);
  });

  it('flags a removed operation', () => {
    const head = spec();
    delete (head.paths as Record<string, unknown>)['/types'];
    const diff = diffSpecs(spec(), head);
    expect([...diff.removed]).toEqual(['listTypes']);
    expect(diff.changed.size).toBe(0);
  });

  it('does not flag an added operation, a change to an unreferenced schema, or a missing description', () => {
    const head = spec();
    (head.components.schemas as Record<string, unknown>).Unrelated = { type: 'number' };
    (head.paths as Record<string, unknown>)['/new'] = { get: { operationId: 'brandNew', responses: {} } };
    const diff = diffSpecs(spec(), head);
    expect(diff.changed.size + diff.removed.size).toBe(0);
    expect(fingerprintOperations(null).size).toBe(0);
    expect(fingerprintOperations({}).size).toBe(0);
  });
});

describe('scanCitations', () => {
  it('reads a rule link, a chapter link and an operation link, in prose and in a component', () => {
    const mdx = [
      `A rule: [\`blobs/lend-earlier-version\`](${SPEC}/blobs.md#blobslend-earlier-version).`,
      `The chapter: [blobs](${SPEC}/blobs.md) and again [blobs](${SPEC}/blobs.md).`,
      `<Card href="${SPEC}/items.md#a-section" title="Items" />`,
      'See [List items](/api-reference/items/listItems) and [Create](/api-reference/items/createItem#body).',
      'Not a link into the reference: /api-reference/items and /api-reference.',
      `Not a chapter: ${SPEC}/README.md.`,
    ].join('\n');
    expect(scanCitations(mdx)).toEqual({
      rules: [
        { chapter: 'blobs', anchor: 'blobslend-earlier-version' },
        { chapter: 'items', anchor: 'a-section' },
      ],
      chapters: ['blobs'],
      operations: ['listItems', 'createItem'],
    });
  });

  it('finds nothing in a page with no citations', () => {
    expect(scanCitations('Just prose, with `blobs/lend-earlier-version` in code.')).toEqual({
      rules: [],
      chapters: [],
      operations: [],
    });
  });
});

describe('findStale', () => {
  const head: ContractIndex = {
    chapters: {
      blobs: { 'blobs/lend-earlier-version': 'CHANGED', 'blobs/upload-hash': 'bbb', 'blobs/new': 'eee' },
      items: { 'items/create': 'ddd' },
    },
  };
  const comparison: Comparison = {
    contract: diffContract(baseIndex, head),
    operations: diffSpecs(spec(), (() => {
      const next = spec({ listItems: { summary: 'x' } });
      delete (next.paths as Record<string, unknown>)['/types'];
      return next;
    })()),
  };
  const pages = {
    'content/docs/build/files.mdx': [
      `[a](${SPEC}/blobs.md#blobslend-earlier-version) [b](${SPEC}/blobs.md#blobsgone)`,
      `[c](${SPEC}/blobs.md#blobsupload-hash) [d](/api-reference/items/listItems) [e](/api-reference/types/listTypes)`,
    ].join('\n'),
    'content/docs/build/chapter.mdx': `[blobs](${SPEC}/blobs.md) [items](${SPEC}/items.md) [x](${SPEC}/blobs.md#uploading)`,
    'content/docs/build/quiet.mdx': `[c](${SPEC}/blobs.md#blobsupload-hash) [items](${SPEC}/items.md) [op](/api-reference/items/createItem)`,
  };

  it('lists a page under each rule or operation it cites that changed or went away', () => {
    expect(findStale(pages, comparison).pages).toEqual([
      {
        path: 'content/docs/build/files.mdx',
        rulesChanged: ['blobs/lend-earlier-version'],
        rulesRemoved: ['blobs/gone'],
        operationsChanged: ['listItems'],
        operationsRemoved: ['listTypes'],
      },
    ]);
  });

  it('lists a page that cites a chapter, or a heading in it that is no rule, only when a rule in it changed', () => {
    const { chapterPages } = findStale(pages, comparison);
    expect(chapterPages.map((page) => [page.path, page.chapters.map((c) => c.chapter)])).toEqual([
      ['content/docs/build/chapter.mdx', ['blobs']],
    ]);
  });

  it('does not list a page that cites only what did not change', () => {
    const { pages: listed, chapterPages } = findStale(
      { 'content/docs/quiet.mdx': pages['content/docs/build/quiet.mdx'] },
      comparison,
    );
    expect(listed).toEqual([]);
    expect(chapterPages).toEqual([]);
  });

  it('skips a source it could not compare', () => {
    const found = findStale(pages, { operations: comparison.operations });
    expect(found.pages[0]).toMatchObject({ rulesChanged: [], operationsChanged: ['listItems'] });
    expect(found.chapterPages).toEqual([]);
  });
});

describe('renderReport', () => {
  it('groups by page, then lists chapters lower down', () => {
    const head: ContractIndex = { chapters: { blobs: { 'blobs/lend-earlier-version': 'CHANGED', 'blobs/upload-hash': 'bbb', 'blobs/gone': 'ccc' }, items: baseIndex.chapters.items } };
    const comparison: Comparison = { contract: diffContract(baseIndex, head), operations: diffSpecs(spec(), spec()) };
    const report = renderReport(
      'v0.0.5',
      'v0.0.6',
      findStale(
        {
          'content/docs/a.mdx': `[r](${SPEC}/blobs.md#blobslend-earlier-version)`,
          'content/docs/b.mdx': `[c](${SPEC}/blobs.md)`,
        },
        comparison,
      ),
      ['Operations were not compared: `openapi.json` does not exist at `v0.0.5`.'],
    );
    expect(report).toBe(
      [
        '## Docs staleness report',
        '',
        'Compared `v0.0.5` with `v0.0.6`. Each page below cites something that changed. Reading it again is the task: "no change needed" is a normal answer.',
        '',
        '- Operations were not compared: `openapi.json` does not exist at `v0.0.5`.',
        '',
        '### `content/docs/a.mdx`',
        '',
        '- Rule changed: `blobs/lend-earlier-version`',
        '',
        '### Chapter changed',
        '',
        'These pages link to a chapter as a whole, and a rule in that chapter changed, went away or was added. They are lower priority: that rule may have nothing to do with the page.',
        '',
        '- `content/docs/b.mdx`',
        '  - `blobs`: 1 changed (`blobs/lend-earlier-version`)',
        '',
      ].join('\n'),
    );
  });

  it('says so when nothing is stale, and caps a long list of rules in a chapter', () => {
    const none = renderReport('a', 'b', { pages: [], chapterPages: [] });
    expect(none).toContain('No hand-written page cites a rule or an operation that changed.');

    const many = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`blobs/r${i}`, 'x']));
    const diff = diffContract({ chapters: { blobs: many } }, { chapters: { blobs: Object.fromEntries(Object.keys(many).map((id) => [id, 'y'])) } });
    const report = renderReport('a', 'b', findStale({ 'content/docs/c.mdx': `[b](${SPEC}/blobs.md)` }, { contract: diff }));
    expect(report).toContain('`blobs`: 8 changed (`blobs/r0`, `blobs/r1`, `blobs/r2`, `blobs/r3`, `blobs/r4`, and 3 more)');
    expect(report).toContain('No page cites a changed rule or operation by name.');
  });
});

describe('the command', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'staleness-'));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const script = fileURLToPath(new URL('../../scripts/staleness-report.ts', import.meta.url));
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { cwd: root, encoding: 'utf8' });
  const write = (file: string, text: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  const run = (...args: string[]) =>
    execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', script, ...args], { cwd: root, encoding: 'utf8' });

  it('reads the two commits and the pages at the head', () => {
    git('init', '-q', '-b', 'main');
    write('content/docs/files.mdx', `[r](${SPEC}/blobs.md#blobsupload-hash) [o](/api-reference/items/listItems)\n`);
    write('content/docs/other.mdx', 'No citations.\n');
    write('src/generated/contract-index.json', JSON.stringify({ chapters: { blobs: { 'blobs/upload-hash': 'a' } } }));
    write('openapi.json', JSON.stringify(spec()));
    git('add', '-A');
    git('commit', '-q', '-m', 'one');
    write('src/generated/contract-index.json', JSON.stringify({ chapters: { blobs: { 'blobs/upload-hash': 'b' } } }));
    write('openapi.json', JSON.stringify(spec({ listItems: { summary: 'x' } })));
    git('commit', '-q', '-am', 'two');

    const report = run('HEAD~1', 'HEAD');
    expect(report).toContain('### `content/docs/files.mdx`');
    expect(report).toContain('- Rule changed: `blobs/upload-hash`');
    expect(report).toContain('- Operation changed: `listItems`');
    expect(report).not.toContain('other.mdx');
  });

  it('says what it could not compare, and still reports the rest', () => {
    const report = run('HEAD~1', 'HEAD');
    expect(report).not.toContain('were not compared');
    git('rm', '-q', '--cached', 'src/generated/contract-index.json');
    git('commit', '-q', '-m', 'three');
    const partial = run('HEAD~1', 'HEAD');
    expect(partial).toContain('Rules were not compared: `src/generated/contract-index.json` does not exist at `HEAD`.');
    expect(partial).toContain('No hand-written page cites a rule or an operation that changed.');
  });

  it('refuses a call without two refs', () => {
    expect(() => execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', script, 'only-one'], { cwd: root, stdio: 'pipe' })).toThrow();
  });
});
