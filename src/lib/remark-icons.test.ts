import { describe, expect, it } from 'vitest';
import type { Connector } from './connectors';
import { type IconSources, remarkIcons } from './remark-icons';

const connector = (name: string, source: string, sourceMark?: string): Connector => ({
  directory: `connectors/${name}`,
  name,
  description: '',
  source,
  sourceName: source,
  ...(sourceMark ? { sourceMark } : {}),
  types: [],
  carriesBack: false,
  carriesBackCanBeTurnedOff: false,
  carriedTypes: [],
});

const sources: IconSources = {
  typeIcons: new Map([
    ['core.note', 'lucide:sticky-note'],
    ['core.media.film', 'lucide:film'],
  ]),
  connectors: [connector('github', 'github', 'simple-icons:github'), connector('readwise', 'readwise')],
};

type Node = { type: string; value?: string; url?: string; name?: string | null; attributes?: { type: 'mdxJsxAttribute'; name: string; value: string }[]; children?: Node[] };

const code = (value: string): Node => ({ type: 'inlineCode', value });
const cellOf = (...children: Node[]): Node => ({ type: 'tableCell', children });
const rowOf = (...cells: Node[]): Node => ({ type: 'tableRow', children: cells });
const textCell = (value: string) => cellOf({ type: 'text', value });
const table = (header: string, ...rows: Node[]): Node => ({
  type: 'table',
  children: [rowOf(textCell(header), textCell('Other')), ...rows],
});
const typeRow = (id: string, url: string): Node =>
  rowOf(cellOf({ type: 'link', url, children: [code(id)] }), textCell('A description'));

function run(tree: Node, page: string, frontmatter: object = {}) {
  const file = { path: `/work/content/docs/${page}`, data: { frontmatter } as Record<string, unknown> };
  remarkIcons(() => sources)()(tree, file);
  return file.data;
}

const icons = (node: Node): Node[] =>
  node.type === 'mdxJsxTextElement' ? [node] : (node.children ?? []).flatMap(icons);

describe('remarkIcons', () => {
  it('gives a type page its own icon, from its identifier', () => {
    const data = run({ type: 'root', children: [] }, 'catalog/(types)/(core)/note.mdx', { identifier: 'core.note' });
    expect(data.pageIcon).toMatchObject({ width: 24, height: 24 });
  });

  it('gives a type with no icon, and any other page, none', () => {
    expect(run({ type: 'root', children: [] }, 'catalog/(types)/(system)/view.mdx', { identifier: 'system.view' }).pageIcon).toBeUndefined();
    expect(run({ type: 'root', children: [] }, 'catalog/events.mdx').pageIcon).toBeUndefined();
    expect(run({ type: 'root', children: [] }, 'build/define-a-type.mdx', { identifier: 'core.note' }).pageIcon).toBeUndefined();
  });

  it('puts a type\'s icon before its name in a Types list, and only there', () => {
    const list = table('Type', typeRow('core.note', '/catalog/note'), typeRow('system.view', '/catalog/view'));
    const tree: Node = { type: 'root', children: [list] };
    run(tree, 'catalog/(types)/types.mdx');
    const [noteRow, viewRow] = list.children!.slice(1);
    expect(icons(noteRow)).toHaveLength(1);
    expect(noteRow.children![0].children![0].name).toBe('Icon');
    expect(noteRow.children![0].children![1].type).toBe('link');
    expect(icons(viewRow)).toHaveLength(0);
  });

  it('leaves a table outside the Catalog, and a link that is not a type\'s page, alone', () => {
    const outside = table('Type', typeRow('core.note', '/catalog/note'));
    run({ type: 'root', children: [outside] }, 'build/items-and-types.mdx');
    expect(icons(outside)).toHaveLength(0);
    const elsewhere = table('Type', typeRow('core.note', '/build/items-and-types'));
    run({ type: 'root', children: [elsewhere] }, 'catalog/(types)/types.mdx');
    expect(icons(elsewhere)).toHaveLength(0);
  });

  it('gives a connector page its mark, and one with no mark none', () => {
    expect(run({ type: 'root', children: [] }, 'catalog/connectors/github.mdx').pageIcon).toBeDefined();
    expect(run({ type: 'root', children: [] }, 'catalog/connectors/readwise.mdx').pageIcon).toBeUndefined();
  });

  it('fails a connector page that no connector is named for', () => {
    expect(() => run({ type: 'root', children: [] }, 'catalog/connectors/gitlab.mdx')).toThrow(/lists no connector named "gitlab"/);
    expect(() => run({ type: 'root', children: [] }, 'catalog/connectors/index.mdx')).not.toThrow();
  });

  it('draws the mark in a Mark column and keeps its ID for the Markdown copy', () => {
    const list = table(
      'Mark',
      rowOf(cellOf(code('simple-icons:github')), textCell('GitHub')),
      rowOf(cellOf(), textCell('Readwise')),
    );
    run({ type: 'root', children: [list] }, 'catalog/connectors/index.mdx');
    const [github, readwise] = list.children!.slice(1);
    const [icon] = icons(github);
    expect(icon.attributes!.find((a) => a.name === 'markdown')?.value).toBe('simple-icons:github');
    expect(icons(readwise)).toHaveLength(0);
  });

  it('fails a mark that is not an icon, so no page quietly shows a blank', () => {
    const list = table('Mark', rowOf(cellOf(code('simple-icons:no-such-mark')), textCell('X')));
    expect(() => run({ type: 'root', children: [list] }, 'catalog/connectors/index.mdx')).toThrow(/is not an icon/);
  });
});
