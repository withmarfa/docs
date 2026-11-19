import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIELD_TABLE_CLASS, isFieldTable, rehypeFieldTables } from './field-tables';
import type { HastNode } from './table-labels';

const el = (tagName: string, children: HastNode[] = [], properties: Record<string, unknown> = {}): HastNode => ({ type: 'element', tagName, properties, children });
const txt = (value: string): HastNode => ({ type: 'text', value });
const table = (...names: string[]) => el('table', [el('thead', [el('tr', names.map((name) => el('th', [txt(name)])))]), el('tbody')]);

describe('rehypeFieldTables', () => {
  it('marks a table that starts with Field and Kind, and no other', () => {
    const field = table('Field', 'Kind', 'Description');
    const setting = table('Setting', 'Value');
    const tree: HastNode = { type: 'root', children: [field, setting] };
    rehypeFieldTables()(tree);
    expect(field.properties?.className).toEqual([FIELD_TABLE_CLASS]);
    expect(setting.properties?.className).toBeUndefined();
  });

  it('keeps a class the table already has', () => {
    const field = el('table', table('Field', 'Kind').children, { className: ['x'] });
    rehypeFieldTables()({ type: 'root', children: [field] });
    expect(field.properties?.className).toEqual(['x', FIELD_TABLE_CLASS]);
  });

  it('reads a header with inline code or a link in its cells as its text', () => {
    expect(isFieldTable(el('table', [el('thead', [el('tr', [el('th', [el('strong', [txt('Field')])]), el('th', [txt(' Kind ')])])])]))).toBe(true);
    expect(isFieldTable(table('Field', 'Kind'))).toBe(true);
  });
});

// Every generated field table begins with Field and Kind, so the rule above
// reaches them all. A table the sync writes with another first two headers
// would be left unaligned, and this fails to say so.
describe('the generated field tables', () => {
  const dir = path.join(__dirname, '../generated/catalog');
  const lines = readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .flatMap((file) => readFileSync(path.join(dir, file), 'utf8').split('\n').map((line) => ({ file, line })));

  it('start with Field and Kind, then Description', () => {
    const headers = lines.filter(({ line }) => /^\| Field\s/.test(line));
    expect(headers.length).toBeGreaterThan(20);
    for (const { file, line } of headers) expect(line, file).toMatch(/^\| Field\s+\| Kind\s+\| Description\s+\|$/);
  });
});
