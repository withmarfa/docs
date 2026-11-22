import { readFileSync } from 'node:fs';
import path from 'node:path';

/** One connector, as the sync derives it from the connector's `plugin.json`. */
export interface Connector {
  directory: string;
  name: string;
  title: string;
  description: string;
  source: string;
  sourceName: string;
  mark?: string;
  types: string[];
  carriesBack: boolean;
  carriedTypes: string[];
}

/**
 * The synced copy of the list (`scripts/sync-from-plugins.sh`), in the order the
 * sidebar lists the pages: by file name.
 */
export function readConnectors(root: string = process.cwd()): Connector[] {
  const file = path.join(root, 'src/generated/connectors/connectors.json');
  const list = JSON.parse(readFileSync(file, 'utf8')) as { connectors: Connector[] };
  const fileName = (connector: Connector) => `${connector.name}.mdx`;
  return [...list.connectors].sort((a, b) => (fileName(a) < fileName(b) ? -1 : fileName(a) > fileName(b) ? 1 : 0));
}
