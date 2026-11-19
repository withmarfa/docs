import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Icons are drawn from two pinned Iconify sets, read while the pages are
 * compiled, so a built page carries only the few icons it shows and nothing
 * asks an icon service at runtime. Marfa's contract (`types/icon-name`) accepts
 * an ID only from these two sets at these versions, so the same name draws the
 * same icon here as in an app.
 */
export const ICON_SETS = {
  lucide: { package: '@iconify-json/lucide', version: '1.2.149' },
  'simple-icons': { package: '@iconify-json/simple-icons', version: '1.2.101' },
} as const;

export type IconSetName = keyof typeof ICON_SETS;

/** What an `Icon` draws: the inside of an SVG and the size it is drawn on. */
export interface IconData {
  body: string;
  width: number;
  height: number;
}

interface IconifySet {
  prefix: string;
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number; hidden?: boolean }>;
}

const sets = new Map<IconSetName, IconifySet>();

function loadSet(name: IconSetName): IconifySet {
  let set = sets.get(name);
  if (!set) {
    const resolve = createRequire(path.join(process.cwd(), 'package.json')).resolve;
    set = JSON.parse(readFileSync(resolve(`${ICON_SETS[name].package}/icons.json`), 'utf8')) as IconifySet;
    sets.set(name, set);
  }
  return set;
}

/**
 * The icon an ID names, as `<set>:<name>`. An ID outside the two sets, a name
 * the set lacks, an alias and an icon the set marks hidden all throw, as the
 * contract refuses them: a page never quietly shows no icon where one was meant.
 */
export function resolveIcon(id: string): IconData {
  const [setName, name, ...rest] = id.split(':');
  if (!name || rest.length > 0 || !Object.hasOwn(ICON_SETS, setName)) {
    throw new Error(`"${id}" is not an icon ID from ${Object.keys(ICON_SETS).join(' or ')}.`);
  }
  const set = loadSet(setName as IconSetName);
  const icon = Object.hasOwn(set.icons, name) ? set.icons[name] : undefined;
  if (!icon || icon.hidden) {
    throw new Error(`"${id}" is not an icon in ${ICON_SETS[setName as IconSetName].package} ${ICON_SETS[setName as IconSetName].version}.`);
  }
  return { body: icon.body, width: icon.width ?? set.width ?? 16, height: icon.height ?? set.height ?? 16 };
}
