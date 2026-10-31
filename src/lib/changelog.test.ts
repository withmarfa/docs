import { describe, expect, it } from 'vitest';
import { changelogMarkdown, formatDate, headingId, parseInline, parseNotes, partsOf, releaseToc, type Release } from './changelog';

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
    expect(notes.breaking?.type).toBe('paragraph');
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
    expect(parseNotes('A fix.\n\n### Server\n- **Fixed:** a thing.').breaking).toBeNull();
  });

  it('reads notes with no parts, an empty body, CRLF line endings and the older Full Changelog line', () => {
    expect(parseNotes('Only a sentence.').parts).toEqual([]);
    expect(parseNotes('')).toEqual({ summary: [], breaking: null, parts: [], fullChangelog: null });
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
