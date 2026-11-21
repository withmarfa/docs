import { readFileSync } from 'node:fs';
import path from 'node:path';

/** One connector, as the plugins repository's `connectors.json` lists it. */
export interface Connector {
  directory: string;
  name: string;
  description: string;
  source: string;
  sourceName: string;
  sourceMark?: string;
  types: string[];
  carriesBack: boolean;
  carriesBackCanBeTurnedOff: boolean;
  carriedTypes: string[];
}

/**
 * The synced copy of the list (`scripts/sync-from-plugins.sh`), in the order the
 * sidebar lists the pages: by file name, which puts `readwise-reader` before `readwise`.
 */
export function readConnectors(root: string = process.cwd()): Connector[] {
  const file = path.join(root, 'src/generated/connectors/connectors.json');
  const list = JSON.parse(readFileSync(file, 'utf8')) as { connectors: Connector[] };
  const fileName = (connector: Connector) => `${connector.name}.mdx`;
  return [...list.connectors].sort((a, b) => (fileName(a) < fileName(b) ? -1 : fileName(a) > fileName(b) ? 1 : 0));
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The connector's page title: its source's display name, then any words its
 * name adds to the source (`readwise-reader` for source `readwise` is Readwise
 * Reader). Two connectors can share a source, so a name, not a source, keys a page.
 */
export function connectorTitle(connector: Pick<Connector, 'name' | 'source' | 'sourceName'>): string {
  if (connector.name === connector.source) return connector.sourceName;
  const rest = connector.name.startsWith(`${connector.source}-`) ? connector.name.slice(connector.source.length + 1) : connector.name;
  const words = rest.split('-').map(capitalize).join(' ');
  return connector.name.startsWith(`${connector.source}-`) ? `${connector.sourceName} ${words}` : words;
}
