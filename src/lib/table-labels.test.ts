import { describe, expect, it } from 'vitest';
import { labelTable, type HastNode } from './table-labels';

const cell = (tagName: string, value: string): HastNode => ({
  type: 'element',
  tagName,
  properties: {},
  children: [{ type: 'text', value }],
});
const row = (tagName: string, values: string[]): HastNode => ({
  type: 'element',
  tagName: 'tr',
  children: values.map((value) => cell(tagName, value)),
});
const table = (head: string[], ...rows: string[][]): HastNode => ({
  type: 'element',
  tagName: 'table',
  children: [
    { type: 'element', tagName: 'thead', children: [row('th', head)] },
    { type: 'element', tagName: 'tbody', children: rows.map((values) => row('td', values)) },
  ],
});
const labels = (node: HastNode) =>
  (node.children?.[1]?.children ?? []).map((r) => (r.children ?? []).map((c) => c.properties?.dataLabel));

describe('labelTable', () => {
  it('labels every cell after the first with its column name', () => {
    const node = table(['Variable', 'What it does', 'Default'], ['A', 'Sets a', 'None']);
    labelTable(node);
    expect(labels(node)).toEqual([[undefined, 'What it does', 'Default']]);
  });

  it('leaves a two-column table unlabelled', () => {
    const node = table(['Code', 'Meaning'], ['0', 'Success']);
    labelTable(node);
    expect(labels(node)).toEqual([[undefined, undefined]]);
  });

  it('skips a column with an empty header', () => {
    const node = table(['Name', '', 'Kind'], ['a', 'b', 'c']);
    labelTable(node);
    expect(labels(node)).toEqual([[undefined, undefined, 'Kind']]);
  });
});
