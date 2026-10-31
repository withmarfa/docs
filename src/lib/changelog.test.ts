import { describe, expect, it } from 'vitest';
import { remarkStructure } from 'fumadocs-core/mdx-plugins';
import { createSearchAPI } from 'fumadocs-core/search/server';
import { tokenizeSearchText } from './docs-tools';
import { changelogMarkdown, formatDate, headingId, parseInline, parseNotes, partsOf, releaseRows, releaseToc, remarkChangelogIndex, type Release } from './changelog';

const NOTES = `Marfa now keeps a task's repeats on the server.

**Breaking:** \`core.task\` no longer accepts \`repeat\` as text. Send an object.

### Server
- **Added:** a \`repeat\` object on tasks. [Docs](https://docs.marfa.so/catalog/task)
- **Fixed:** a window that read its bounds twice.
  The second read is gone.

### CLI
- **Changed:** \`marfa items list\` prints the repeat.
  - **Removed:** the \`--repeat-text\` option.

### Swift SDK
- **Changed:** \`Task.repeat\` is a value.

**Full changelog:** https://github.com/withmarfa/marfa/compare/v0.0.50...v0.0.51`;

describe('parseInline', () => {
  it('reads code, bold, links and bare addresses', () => {
    expect(parseInline('**Added:** `a` and [b](/c), see https://x.test/d.')).toEqual([
      { type: 'strong', children: [{ type: 'text', value: 'Added:' }] },
      { type: 'text', value: ' ' },
      { type: 'code', value: 'a' },
      { type: 'text', value: ' and ' },
      { type: 'link', href: '/c', children: [{ type: 'text', value: 'b' }] },
      { type: 'text', value: ', see ' },
      { type: 'link', href: 'https://x.test/d', children: [{ type: 'text', value: 'https://x.test/d' }] },
      { type: 'text', value: '.' },
    ]);
  });
});

describe('parseNotes', () => {
  const notes = parseNotes(NOTES);

  it('splits the summary, the Breaking paragraph, each part and the Full changelog link', () => {
    expect(notes.summary).toHaveLength(1);
    expect(notes.breaking.map((b) => b.type)).toEqual(['paragraph']);
    expect(notes.parts.map((p) => p.name)).toEqual(['Server', 'CLI', 'Swift SDK']);
    expect(notes.fullChangelog).toBe('https://github.com/withmarfa/marfa/compare/v0.0.50...v0.0.51');
  });

  it('keeps a wrapped item whole and a nested item under its parent', () => {
    const [server, cli] = notes.parts;
    const items = server.blocks[0].type === 'list' ? server.blocks[0].items : [];
    expect(items).toHaveLength(2);
    expect(items[1].inline.at(-1)).toEqual({ type: 'text', value: ' a window that read its bounds twice. The second read is gone.' });
    const cliItems = cli.blocks[0].type === 'list' ? cli.blocks[0].items : [];
    expect(cliItems).toHaveLength(1);
    expect(cliItems[0].children).toHaveLength(1);
  });

  it('has no Breaking paragraph unless the notes have one', () => {
    expect(parseNotes('A fix.\n\n### Server\n- **Fixed:** a thing.').breaking).toEqual([]);
  });

  it('keeps a list after the Breaking paragraph with it, up to the first part', () => {
    const { summary, breaking, parts } = parseNotes('Summary.\n\n**Breaking:** send an object.\n\n- `repeat` is an object.\n- `repeatText` is gone.\n\nBack up first.\n\n### Server\n- **Added:** a thing.');
    expect(summary.map((b) => b.type)).toEqual(['paragraph']);
    expect(breaking.map((b) => b.type)).toEqual(['paragraph', 'list', 'paragraph']);
    expect(parts).toHaveLength(1);
  });

  it('splits a Breaking line that follows the summary with no blank line between', () => {
    const { summary, breaking } = parseNotes('Tasks repeat.\n**Breaking:** send an object.\n- `repeat` is an object.\n\n### CLI\n- a');
    expect(summary).toEqual([{ type: 'paragraph', inline: [{ type: 'text', value: 'Tasks repeat.' }] }]);
    expect(breaking.map((b) => b.type)).toEqual(['paragraph', 'list']);
  });

  it('does not split a Breaking line inside a code block or under a part', () => {
    const inCode = parseNotes('Summary.\n```text\n**Breaking:** x\n```');
    expect(inCode.breaking).toEqual([]);
    expect(parseNotes('Summary.\n\n### Server\nA change.\n**Breaking:** x').breaking).toEqual([]);
  });

  it('reads the Full changelog line as an address or as a Markdown link', () => {
    const compare = 'https://github.com/withmarfa/marfa/compare/v0.0.50...v0.0.51';
    expect(parseNotes(`x\n\n**Full changelog:** ${compare}`).fullChangelog).toBe(compare);
    expect(parseNotes(`x\n\n**Full Changelog**: [v0.0.50...v0.0.51](${compare})`).fullChangelog).toBe(compare);
    expect(parseNotes(`x\n\n**Full changelog:** [compare](${compare})\n`).fullChangelog).toBe(compare);
    expect(parseNotes(`x\n\n**Full changelog:** [compare](${compare}) and more`).fullChangelog).toBeNull();
  });

  it('reads notes with no parts, an empty body, CRLF line endings and the older Full Changelog line', () => {
    expect(parseNotes('Only a sentence.').parts).toEqual([]);
    expect(parseNotes('')).toEqual({ summary: [], breaking: [], parts: [], fullChangelog: null });
    expect(parseNotes(NOTES.replace(/\n/g, '\r\n')).parts).toHaveLength(3);
    expect(parseNotes('x\n\n**Full Changelog**: https://x.test/y').fullChangelog).toBe('https://x.test/y');
  });

  it('does not read a heading or a Full changelog line inside a code block', () => {
    const inCode = parseNotes('Summary.\n\n```text\n### Server\n**Full changelog:** https://x.test\n```');
    expect(inCode.parts).toEqual([]);
    expect(inCode.fullChangelog).toBeNull();
    expect(inCode.summary[1]).toEqual({ type: 'code', value: '### Server\n**Full changelog:** https://x.test' });
  });
});

describe('partsOf', () => {
  it('lists the known parts in their order, then any other', () => {
    const notes = [parseNotes('x\n\n### Swift SDK\n- a'), parseNotes('x\n\n### Other\n- a\n\n### Server\n- b')];
    expect(partsOf(notes)).toEqual(['Server', 'Swift SDK', 'Other']);
  });
});

describe('the page', () => {
  const releases: Release[] = [
    { tag: 'v0.0.51', publishedAt: '2026-10-31T23:59:00Z', url: 'https://github.com/withmarfa/marfa/releases/tag/v0.0.51', body: NOTES },
    { tag: 'v0.0.50', publishedAt: '2026-10-30T10:00:00Z', url: 'https://github.com/withmarfa/marfa/releases/tag/v0.0.50', body: '## Before you upgrade\n\nBack up first.\n\n```md\n## kept\n```' },
  ];

  it('writes a date as Americans do, in UTC', () => {
    expect(formatDate('2026-10-31T23:59:00Z')).toBe('October 31, 2026');
  });

  it('makes the heading ids Fumadocs makes', () => {
    expect(headingId('v0.0.51')).toBe('v0051');
    expect(releaseToc(releases)).toEqual([
      { title: 'v0.0.51', url: '#v0051', depth: 2 },
      { title: 'v0.0.50', url: '#v0050', depth: 2 },
    ]);
  });

  it('writes every release and every line of its notes into the Markdown copy', () => {
    const markdown = changelogMarkdown(releases);
    expect(markdown).toContain('## v0.0.51\n\nReleased October 31, 2026. [v0.0.51 on GitHub](https://github.com/withmarfa/marfa/releases/tag/v0.0.51)\n\n');
    for (const line of NOTES.split('\n')) expect(markdown).toContain(line);
    expect(markdown.indexOf('## v0.0.51')).toBeLessThan(markdown.indexOf('## v0.0.50'));
  });

  it('moves a notes heading above level 3 down, outside code', () => {
    const markdown = changelogMarkdown(releases);
    expect(markdown).toContain('### Before you upgrade');
    expect(markdown).not.toMatch(/^## Before/m);
    expect(markdown).toContain('```md\n## kept\n```');
  });

  it('is empty when there are no releases', () => {
    expect(changelogMarkdown([])).toBe('');
  });
});

describe('the search rows', () => {
  const fixture: Release[] = [
    {
      tag: 'v0.0.52',
      publishedAt: '2026-11-03T10:00:00Z',
      url: 'https://github.com/withmarfa/marfa/releases/tag/v0.0.52',
      body: 'Marfa now keeps zebrafish sessions.\n\n**Breaking:** send `repeat` as an object.\n\n- The `repeatText` field is gone.\n\n### CLI\n- **Fixed:** `marfa items list` paged twice.\n  - Nested quokka detail.\n\n**Full changelog:** https://github.com/withmarfa/marfa/compare/v0.0.51...v0.0.52',
    },
  ];

  it('holds the version and date, the summary, the Breaking paragraph and each change under its part', () => {
    expect(releaseRows(fixture)).toEqual(
      [
        'v0.0.52, released November 3, 2026',
        'Marfa now keeps zebrafish sessions.',
        'Breaking: send repeat as an object.',
        'The repeatText field is gone.',
        'CLI: Fixed: marfa items list paged twice.',
        'CLI: Nested quokka detail.',
      ].map((content) => ({ heading: 'v0052', content })),
    );
    expect(releaseRows([])).toEqual([]);
  });

  // The page's MDX is a paragraph and `<Changelog />`, which has no text. Run the steps the site's build runs, up to the index.
  function indexOf(releases: Release[]) {
    const tree = {
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'Intro.' }] },
        { type: 'mdxJsxFlowElement', name: 'Changelog', attributes: [], children: [] },
      ],
    };
    remarkChangelogIndex(() => releases)()(tree);
    const file = { data: {} as { structuredData?: { headings: { id: string; content: string }[]; contents: { heading: string; content: string }[] } } };
    (remarkStructure as unknown as () => (tree: unknown, file: unknown) => void)()(tree, file);
    return file.data.structuredData!;
  }

  it('reaches the index of a page whose MDX holds only the component', () => {
    const data = indexOf(fixture);
    expect(data.contents.map((c) => c.content)).toEqual(['Intro.', ...releaseRows(fixture).map((r) => r.content)]);
    expect(data.contents.at(-1)?.heading).toBe('v0052');
  });

  it('finds a release by its version, and by a word that only its notes use', async () => {
    const structuredData = indexOf(fixture);
    const api = createSearchAPI('advanced', {
      indexes: [{ id: '/changelog', title: 'Changelog', url: '/changelog', structuredData }],
      tokenizer: { language: 'english', normalizationCache: new Map(), tokenize: (raw, _language, property) => tokenizeSearchText(raw, property === undefined) },
    });
    for (const query of ['v0.0.52', '0.0.52', 'zebrafish', 'quokka', 'repeatText']) {
      const found = (await api.search(query)).filter((r) => r.type === 'text');
      expect(found.length, query).toBeGreaterThan(0);
      expect(found.every((r) => r.url === '/changelog#v0052'), query).toBe(true);
    }
    expect(await api.search('narwhal')).toEqual([]);
  });
});
