import { readFileSync } from 'node:fs';
import path from 'node:path';

/** One connector, as marfa-connectors' `connectors.json` lists it. */
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

/** The synced copy of the list (`scripts/sync-from-connectors.sh`), by name. */
export function readConnectors(root: string = process.cwd()): Connector[] {
  const file = path.join(root, 'src/generated/connectors/connectors.json');
  const list = JSON.parse(readFileSync(file, 'utf8')) as { connectors: Connector[] };
  return [...list.connectors].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function capitalise(word: string): string {
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
  const words = rest.split('-').map(capitalise).join(' ');
  return connector.name.startsWith(`${connector.source}-`) ? `${connector.sourceName} ${words}` : words;
}
