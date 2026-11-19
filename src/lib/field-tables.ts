import { type HastNode } from './table-labels';

/**
 * A rehype plugin that marks a field table: a table whose header starts with
 * Field and Kind, which is how every generated field table on a Catalog page
 * begins. The stylesheet gives those two columns one fixed width, so the tables
 * on one page line up and the description column starts at the same place in
 * each.
 */
export const FIELD_TABLE_CLASS = 'marfa-field-table';

function text(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(text).join('');
}

function headerNames(table: HastNode): string[] {
  const names: string[] = [];
  const visit = (node: HastNode) => {
    for (const child of node.children ?? []) {
      if (child.type !== 'element') continue;
      if (child.tagName === 'th') names.push(text(child).trim());
      else if (child.tagName === 'thead' || child.tagName === 'tr') visit(child);
    }
  };
  for (const child of table.children ?? []) {
    if (child.type === 'element' && child.tagName === 'thead') visit(child);
  }
  return names;
}

export function isFieldTable(table: HastNode): boolean {
  const [first, second] = headerNames(table);
  return first === 'Field' && second === 'Kind';
}

export function rehypeFieldTables() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (node.type === 'element' && node.tagName === 'table' && isFieldTable(node)) {
        const existing = node.properties?.className;
        const classes = Array.isArray(existing) ? existing : typeof existing === 'string' ? [existing] : [];
        node.properties = { ...node.properties, className: [...classes, FIELD_TABLE_CLASS] };
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
