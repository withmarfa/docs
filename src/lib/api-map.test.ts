import { describe, expect, it } from 'vitest';
import spec from '../../openapi.json';
import areas from './api-map-areas.json';
import { apiMapMarkdown, buildApiMap, unmappedTags, type Spec } from './api-map';
import { getLLMText, source } from './source';

const description = spec as Spec;
const map = buildApiMap(description, areas);
const rows = map.flatMap((area) => area.groups.flatMap((group) => group.operations));

describe('the API map against openapi.json', () => {
  it('puts every tag in exactly one area, and names no tag the description lacks', () => {
    const { missing, unknown, repeated } = unmappedTags(description, areas);
    expect(missing, 'Add each tag to an area in src/lib/api-map-areas.json').toEqual([]);
    expect(unknown, 'Remove or rename each tag in src/lib/api-map-areas.json').toEqual([]);
    expect(repeated, 'List each tag in one area only').toEqual([]);
  });

  it('draws every operation of the description once, webhooks included', () => {
    const ids = [
      ...Object.values(description.paths ?? {}),
      ...Object.values(description.webhooks ?? {}),
    ].flatMap((item) => Object.values(item).flatMap((op) => (op?.operationId ? [op.operationId] : [])));
    expect(rows).toHaveLength(ids.length);
    expect(new Set(rows.map((row) => row.href)).size).toBe(rows.length);
  });

  it('links each operation to a page that exists', () => {
    const pages = new Set(source.getPages().map((page) => page.url));
    expect(rows.filter((row) => !pages.has(row.href)).map((row) => row.href)).toEqual([]);
  });

  it("orders a group's operations by its tag's x-operation-order", () => {
    const items = map.flatMap((area) => area.groups).find((group) => group.name === 'Items')!;
    const order = description.tags!.find((tag) => tag.name === 'Items')!['x-operation-order']!;
    expect(items.operations.map((op) => op.href.split('/').pop())).toEqual(order);
  });
});

describe('unmappedTags', () => {
  it('names a tag in no area, an area tag the description lacks, and a tag in two areas', () => {
    const sample: Spec = {
      tags: [{ name: 'Items' }, { name: 'Sources' }],
      paths: { '/x': { get: { operationId: 'getX', tags: ['Undeclared'] } } },
    };
    const result = unmappedTags(sample, {
      areas: [
        { name: 'A', tags: ['Items', 'Gone'] },
        { name: 'B', tags: ['Items'] },
      ],
    });
    expect(result).toEqual({ missing: ['Sources', 'Undeclared'], unknown: ['Gone'], repeated: ['Items'] });
  });
});

describe('the Markdown copy of the API reference overview', () => {
  it('writes every operation as its method, path and a link to its page', async () => {
    const page = source.getPage(['api-reference'])!;
    const text = await getLLMText(page);
    expect(text).toContain(apiMapMarkdown(map));
    for (const row of rows) expect(text).toContain(`\`${row.method} ${row.path}\`: [`);
    expect(text).toContain('- `POST /items`: [Create an item](/api-reference/items/createItem)');
  });
});
