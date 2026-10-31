/**
 * A rehype plugin that names each table cell's column on the cell, as
 * `data-label`. On a phone a table stacks into one entry per row, its header
 * row hidden, and the stylesheet writes the label before a cell so the entry
 * still says what each value is. A two-column table needs no label: its
 * second cell is plainly what the first means. The first cell of a row is the
 * entry's name and is never labelled.
 *
 * Stacking sets `display: block` on the table's parts, which drops their
 * table semantics in some browsers, so every part also gets its ARIA role and
 * a screen reader still hears a table with column headers.
 */

export type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function text(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(text).join('');
}

function elements(node: HastNode, tagName: string): HastNode[] {
  const found: HastNode[] = [];
  const visit = (current: HastNode) => {
    for (const child of current.children ?? []) {
      if (child.type !== 'element') continue;
      if (child.tagName === tagName) found.push(child);
      else if (child.tagName !== 'table') visit(child);
    }
  };
  visit(node);
  return found;
}

const roles: Record<string, string> = {
  table: 'table',
  thead: 'rowgroup',
  tbody: 'rowgroup',
  tfoot: 'rowgroup',
  tr: 'row',
  td: 'cell',
};

function giveRoles(table: HastNode): void {
  const visit = (node: HastNode, inHead: boolean) => {
    if (node.type !== 'element' || !node.tagName) return;
    const role = node.tagName === 'th' ? (inHead ? 'columnheader' : 'rowheader') : roles[node.tagName];
    if (role) node.properties = { ...node.properties, role };
    for (const child of node.children ?? []) {
      if (child.type === 'element' && child.tagName === 'table') continue;
      visit(child, inHead || node.tagName === 'thead');
    }
  };
  visit(table, false);
}

/** Gives one table's parts their roles and labels its cells from its header row. */
export function labelTable(table: HastNode): void {
  giveRoles(table);
  const [head] = elements(table, 'thead');
  const [headRow] = head ? elements(head, 'tr') : [];
  if (!headRow) return;
  const names = elements(headRow, 'th').map((cell) => text(cell).trim());
  if (names.length < 3) return;
  for (const body of elements(table, 'tbody')) {
    for (const row of elements(body, 'tr')) {
      elements(row, 'td').forEach((cell, index) => {
        if (index === 0 || !names[index]) return;
        cell.properties = { ...cell.properties, dataLabel: names[index] };
      });
    }
  }
}

export function rehypeTableLabels() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (node.type === 'element' && node.tagName === 'table') labelTable(node);
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
