/**
 * Holds the Catalog tab to what marfa ships. Its type pages take their title,
 * description and example from the synced type catalog, so a type marfa adds,
 * renames or changes fails here until its page follows. The example is checked
 * the way a create request is: the type exists, every required field is there,
 * no field is one the type lacks, and each value fits its field's kind.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CONTENT = path.join(ROOT, 'content/docs');
const CATALOG_PAGES = path.join(CONTENT, 'catalog');
const GENERATED = path.join(ROOT, 'src/generated/catalog');

interface Field {
  type: string;
  description: string;
  required?: boolean;
  format?: string;
  enum_values?: string[];
  items_type?: string;
  items_fields?: Record<string, Field>;
  status_values?: { value: string; group: string }[];
}

interface CatalogType {
  id: string;
  parent?: string;
  label: string;
  description: string;
  fields: Record<string, Field>;
}

interface CatalogEdgeType {
  id: string;
  label: string;
  reverse_label?: string;
  cardinality: string;
  cascade_on_delete: string;
  reverse_name?: string;
  source_type_constraints: string[];
  target_type_constraints: string[];
}

interface Catalog {
  types: CatalogType[];
  edge_types: CatalogEdgeType[];
  field_types: string[];
}

const catalog: Catalog = JSON.parse(readFileSync(path.join(GENERATED, 'builtin-catalog.json'), 'utf8'));
const spec = JSON.parse(readFileSync(path.join(ROOT, 'openapi.json'), 'utf8'));
const contractIndex: { chapters: Record<string, Record<string, string>> } = JSON.parse(
  readFileSync(path.join(ROOT, 'src/generated/contract-index.json'), 'utf8'),
);

/** What the request that creates an item may carry, from the API description. */
const CREATE_KEYS = new Set<string>(
  Object.keys(spec.paths['/items'].post.requestBody.content['application/json'].schema.properties),
);

// ── The example check ────────────────────────────────────────────────────

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// A date, or a date and a time with a zone, as the contract's `types/datetime-value` takes them.
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/;
const THUMBNAIL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

function isCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isUrl(value: string): boolean {
  if (!/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Why a value does not fit a field's kind, or undefined if it does. */
export function valueError(field: Pick<Field, 'type' | 'enum_values' | 'items_type' | 'status_values'>, value: unknown): string | undefined {
  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') return 'is not a string';
      if (value.includes('\u0000')) return 'holds a NUL';
      return value.length > 100_000 ? 'is longer than 100,000' : undefined;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? undefined : 'is not a number';
    case 'integer':
      return Number.isInteger(value) ? undefined : 'is not a whole number';
    case 'boolean':
      return typeof value === 'boolean' ? undefined : 'is not true or false';
    case 'url':
      return typeof value === 'string' && isUrl(value) ? undefined : 'is not a URL';
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : 'is not an email address';
    case 'datetime':
    case 'date': {
      const match = typeof value === 'string' ? (field.type === 'date' ? DATE : DATETIME).exec(value) : null;
      if (!match) return field.type === 'date' ? 'is not a YYYY-MM-DD date' : 'is not a date, or a date and time with a zone';
      return isCalendarDate(Number(match[1]), Number(match[2]), Number(match[3])) ? undefined : 'names a day the calendar lacks';
    }
    case 'enum':
      return typeof value === 'string' && field.enum_values?.includes(value)
        ? undefined
        : `is not one of ${(field.enum_values ?? []).join(', ')}`;
    case 'status':
      return typeof value === 'string' && field.status_values?.some((entry) => entry.value === value)
        ? undefined
        : `is not one of ${(field.status_values ?? []).map((entry) => entry.value).join(', ')}`;
    case 'array': {
      if (!Array.isArray(value)) return 'is not a list';
      for (const [index, item] of value.entries()) {
        const problem = valueError({ type: field.items_type ?? 'string' }, item);
        if (problem) return `has an element ${index} that ${problem}`;
      }
      return undefined;
    }
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value) ? undefined : 'is not an object';
    case 'thumbnail':
      return typeof value === 'string' && THUMBNAIL.test(value) ? undefined : 'is not a PNG, JPEG or WebP data URI';
    default:
      return `has the kind ${field.type}, which the check does not know`;
  }
}

/** What is wrong with an example item as the body of a create request. Empty if nothing is. */
export function exampleErrors(types: CatalogType[], example: unknown): string[] {
  if (typeof example !== 'object' || example === null || Array.isArray(example)) return ['is not an object'];
  const body = example as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(body)) {
    if (!CREATE_KEYS.has(key)) errors.push(`${key} is not a field of a create request`);
  }
  const type = types.find((candidate) => candidate.id === body.type);
  if (!type) return [...errors, `type ${JSON.stringify(body.type)} is not a shipped type`];
  const properties = body.properties;
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    return [...errors, 'has no properties object'];
  }
  const given = properties as Record<string, unknown>;
  for (const [name, field] of Object.entries(type.fields)) {
    if (field.required && !(name in given)) errors.push(`${name} is required by ${type.id} and missing`);
  }
  for (const [name, value] of Object.entries(given)) {
    const field = type.fields[name];
    if (!field) {
      errors.push(`${name} is not a field of ${type.id}`);
      continue;
    }
    const problem = valueError(field, value);
    if (problem) errors.push(`${name} ${problem}`);
  }
  return errors;
}

// ── Reading a page ───────────────────────────────────────────────────────

/** The JSON block under `## Example`, as text, or undefined if the page has none. */
export function exampleBlock(page: string): string | undefined {
  const lines = page.split('\n');
  let fence: string | null = null;
  let inExample = false;
  let collecting = false;
  const block: string[] = [];
  for (const line of lines) {
    const marker = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence === null) {
      if (marker) {
        fence = marker[1];
        if (inExample && /^json\b/.test(marker[2].trim())) collecting = true;
        continue;
      }
      if (/^## /.test(line)) {
        inExample = line.trim() === '## Example';
      }
    } else if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) {
      if (collecting) return block.join('\n');
      fence = null;
    } else if (collecting) {
      block.push(line);
    }
  }
  return undefined;
}

/** The problems with a page's example: a missing one, a malformed one, or one the catalog refuses. */
export function pageExampleErrors(types: CatalogType[], page: string): string[] {
  const block = exampleBlock(page);
  if (block === undefined) return ['has no JSON block under "## Example"'];
  let example: unknown;
  try {
    example = JSON.parse(block);
  } catch (error) {
    return [`has an example that is not JSON: ${(error as Error).message}`];
  }
  return exampleErrors(types, example);
}

function frontmatter(page: string): Record<string, unknown> {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(page);
  return (block ? parseYaml(block[1]) : {}) as Record<string, unknown>;
}

/**
 * The contract's generator turns an em dash into a colon, and a pair around an aside into parentheses.
 * This copy of the sync script's Python `plain` stays because a test in TypeScript cannot import it, and
 * what it must agree with is the description the sync wrote.
 */
function plain(text: string): string {
  const parts = text.split(/\s*—\s*/);
  if (parts.length === 3) return `${parts[0]} (${parts[1]})${/^[.,;:)]/.test(parts[2]) ? '' : ' '}${parts[2]}`;
  return parts.join(': ');
}

// The Types folder and the two families inside it are folder groups, which add nothing to a page's address.
// The Connectors folder is a real one: its index page is the folder's, and the six connectors sit beneath it.
const PAGES = (readdirSync(CATALOG_PAGES, { recursive: true }) as string[])
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => ({
    slug: path.basename(file, '.mdx') === 'index' && path.dirname(file) !== '.' ? path.basename(path.dirname(file)) : path.basename(file, '.mdx'),
    group: path.dirname(file),
    file: `content/docs/catalog/${file}`,
    text: readFileSync(path.join(CATALOG_PAGES, file), 'utf8'),
  }));

const TOP_LEVEL = catalog.types.filter((type) => !type.parent);
/** A top-level type's page is its identifier without its family: `core.media` is `media`. */
const slugOf = (type: CatalogType) => type.id.slice(type.id.indexOf('.') + 1);
const CORE_TYPES = TOP_LEVEL.filter((type) => type.id.startsWith('core.'));
const SYSTEM_TYPES = TOP_LEVEL.filter((type) => type.id.startsWith('system.'));
const CORE_SLUGS = CORE_TYPES.map(slugOf);
const SYSTEM_SLUGS = SYSTEM_TYPES.map(slugOf);
/** The pages that are not the page of one type. */
const OTHER_PAGES = ['index', 'items', 'types', 'field-kinds', 'type-rules', 'display-hints', 'edges', 'events', 'permissions', 'connectors'];
/** The connectors Marfa ships, one page each beneath the Connectors page. */
const CONNECTORS_DIR = 'connectors';
const CONNECTOR_SLUGS = ['github', 'google-calendar', 'todoist', 'readwise', 'readwise-reader', 'rss'];
/** Where the pages about types sit: in the Types folder, with the two families of types inside it. */
const TYPES_DIR = '(types)';
const TYPES_PAGES = ['types', 'type-rules', 'display-hints', 'field-kinds'];

describe('the catalog the pages follow', () => {
  it('is the synced copy, with the types the pages cover', () => {
    expect(catalog.types.length).toBeGreaterThan(10);
    expect(CORE_SLUGS).toContain('media');
    expect(catalog.types.find((type) => type.id === 'core.media.article')?.fields.title.required).toBe(true);
  });

  it('is read for a create request from the API description', () => {
    expect([...CREATE_KEYS]).toEqual(expect.arrayContaining(['type', 'properties']));
  });
});

describe('the tab', () => {
  it('has one page for each top-level type and the other pages, and no other', () => {
    expect(TOP_LEVEL.every((type) => type.id.startsWith('core.') || type.id.startsWith('system.'))).toBe(true);
    expect(PAGES.map((page) => page.slug).sort()).toEqual([...CORE_SLUGS, ...SYSTEM_SLUGS, ...OTHER_PAGES, ...CONNECTOR_SLUGS].sort());
  });

  it('names an identifier only on the page of a type', () => {
    for (const slug of OTHER_PAGES) {
      const page = PAGES.find((candidate) => candidate.slug === slug)!;
      expect(frontmatter(page.text).identifier, page.file).toBeUndefined();
    }
  });

  it('puts no backtick in a description, which the page cards show as it is', () => {
    for (const { file, text } of PAGES) expect(String(frontmatter(text).description), file).not.toContain('`');
  });

  it('lists exactly those pages in its meta.json files', () => {
    const readMeta = (dir: string) => JSON.parse(readFileSync(path.join(CATALOG_PAGES, dir, 'meta.json'), 'utf8'));
    const meta = readMeta('.');
    expect(meta.root).toBe(true);
    const listed = meta.pages.filter((entry: string) => !entry.startsWith('---'));
    const groups = listed.filter((entry: string) => entry.startsWith('('));
    const direct = listed.filter((entry: string) => !entry.startsWith('('));
    expect(groups).toEqual([TYPES_DIR]);
    const typesMeta = readMeta(TYPES_DIR);
    const families = typesMeta.pages.filter((entry: string) => entry.startsWith('('));
    expect(families).toEqual(['(core)', '(system)']);
    // The Types page is the folder's own page, named by `pagesIndex`, and the folder lists the rest.
    const inTypes = [typesMeta.pagesIndex, ...typesMeta.pages.filter((entry: string) => !entry.startsWith('('))];
    const inFamilies = families.flatMap((family: string) => readMeta(`${TYPES_DIR}/${family}`).pages as string[]);
    const connectorsMeta = readMeta(CONNECTORS_DIR);
    expect(direct).toContain(CONNECTORS_DIR);
    const all = [...direct, ...inTypes, ...inFamilies, ...connectorsMeta.pages];
    expect(all.sort()).toEqual(PAGES.map((page) => page.slug).sort());
    expect(all.length).toBe(new Set(all).size);
  });

  it('opens on the Types page in a closed folder, with the families of types inside it', () => {
    const meta = JSON.parse(readFileSync(path.join(CATALOG_PAGES, TYPES_DIR, 'meta.json'), 'utf8'));
    expect(meta.title).toBe('Types');
    expect(meta.defaultOpen).toBe(false);
    expect(meta.pagesIndex).toBe('types');
  });

  it('puts each family of types in a closed folder named for it, with a page for each of its types', () => {
    const expected = [
      [`${TYPES_DIR}/(core)`, 'Core types', CORE_SLUGS],
      [`${TYPES_DIR}/(system)`, 'System types', SYSTEM_SLUGS],
    ] as const;
    for (const [dir, title, slugs] of expected) {
      const meta = JSON.parse(readFileSync(path.join(CATALOG_PAGES, dir, 'meta.json'), 'utf8'));
      expect(meta.title).toBe(title);
      expect(meta.defaultOpen).toBe(false);
      expect([...meta.pages].sort()).toEqual([...slugs].sort());
      expect(PAGES.filter((page) => page.group === dir).map((page) => page.slug).sort()).toEqual([...slugs].sort());
    }
  });

  it('keeps the pages about types in the Types folder and the others directly in the tab', () => {
    expect(PAGES.filter((page) => page.group === TYPES_DIR).map((page) => page.slug).sort()).toEqual([...TYPES_PAGES].sort());
    expect(PAGES.filter((page) => page.group === '.').map((page) => page.slug).sort()).toEqual(
      OTHER_PAGES.filter((slug) => !TYPES_PAGES.includes(slug) && slug !== CONNECTORS_DIR).sort(),
    );
  });

  it('opens the Connectors folder on its own page, closed, with a page for each connector beneath it', () => {
    const meta = JSON.parse(readFileSync(path.join(CATALOG_PAGES, CONNECTORS_DIR, 'meta.json'), 'utf8'));
    expect(meta.title).toBe('Connectors');
    expect(meta.defaultOpen).toBe(false);
    expect([...meta.pages].sort()).toEqual([...CONNECTOR_SLUGS].sort());
    expect(
      PAGES.filter((page) => page.group === CONNECTORS_DIR)
        .map((page) => page.slug)
        .sort(),
    ).toEqual(['connectors', ...CONNECTOR_SLUGS].sort());
  });

  it('shows each generated file on exactly one page', () => {
    const shown = PAGES.flatMap(({ text }) =>
      [...text.matchAll(/<include cwd>src\/generated\/catalog\/([^<#]+)<\/include>/g)].map((match) => match[1]),
    );
    const written = readdirSync(GENERATED).filter((file) => file.endsWith('.md'));
    expect(shown.sort()).toEqual(written.sort());
  });
});

describe('a core type page', () => {
  for (const slug of CORE_SLUGS) {
    const type = catalog.types.find((candidate) => candidate.id === `core.${slug}`)!;
    const page = PAGES.find((candidate) => candidate.slug === slug)!;

    describe(page.file, () => {
      it('is titled with the type\'s label, described with its description and names its identifier', () => {
        const data = frontmatter(page.text);
        expect(data.title).toBe(type.label);
        expect(data.identifier).toBe(type.id);
        // A backtick in a frontmatter description shows literally in the cards at the foot of a page.
        expect(data.description).toBe(plain(type.description).replace(/`/g, ''));
      });

      it('includes the type\'s generated file', () => {
        expect(page.text).toContain(`<include cwd>src/generated/catalog/${type.id}.md</include>`);
        expect(existsSync(path.join(GENERATED, `${type.id}.md`))).toBe(true);
      });

      it('gives an example that fits the type it names, or one of its subtypes', () => {
        expect(pageExampleErrors(catalog.types, page.text)).toEqual([]);
        const example = JSON.parse(exampleBlock(page.text)!);
        expect(example.type === type.id || example.type.startsWith(`${type.id}.`)).toBe(true);
      });
    });
  }

});

describe('a system type page', () => {
  it('exists for each system type', () => {
    expect(SYSTEM_TYPES.length).toBeGreaterThan(0);
  });

  for (const type of SYSTEM_TYPES) {
    const page = PAGES.find((candidate) => candidate.slug === slugOf(type))!;

    describe(page.file, () => {
      it('is titled and described from the type, and includes its generated file', () => {
        const data = frontmatter(page.text);
        expect(data.title).toBe(type.label);
        expect(data.identifier).toBe(type.id);
        expect(data.description).toBe(plain(type.description).replace(/`/g, ''));
        expect(page.text).toContain(`<include cwd>src/generated/catalog/${type.id}.md</include>`);
      });

      it('gives no example, because no item operation writes the type', () => {
        expect(page.text).not.toMatch(/^## Example/m);
      });
    });
  }
});

describe('the generated type tables', () => {
  const files = readdirSync(GENERATED).filter((file) => /^(core|system)\.[a-z]+\.md$/.test(file));

  /** Each field row of each table, as its name and whether its Kind cell marks it required. */
  function fieldRows(text: string): [string, string][] {
    const rows: [string, string][] = [];
    let kind = -1;
    for (const line of text.split('\n')) {
      if (!line.startsWith('|')) {
        kind = -1;
        continue;
      }
      const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.trim());
      if (cells[0] === 'Field') kind = cells.indexOf('Kind');
      else if (kind >= 0 && !/^-+$/.test(cells[0])) rows.push([cells[0], cells[kind]]);
    }
    return rows;
  }

  it('give each field a kind, in three columns', () => {
    expect(files.length).toBe(TOP_LEVEL.length);
    let seen = 0;
    for (const file of files) {
      const text = readFileSync(path.join(GENERATED, file), 'utf8');
      for (const header of text.split('\n').filter((line) => line.startsWith('| Field '))) {
        expect(header.split('|').slice(1, -1).map((cell) => cell.trim()), file).toEqual(['Field', 'Kind', 'Description']);
      }
      for (const [name, kind] of fieldRows(text)) {
        seen += 1;
        expect(kind, `${file}: ${name}`).toMatch(/^`[a-z]+`/);
      }
    }
    expect(seen).toBeGreaterThan(30);
  });

  it('mark as required exactly the fields a type requires', () => {
    for (const type of TOP_LEVEL) {
      const text = readFileSync(path.join(GENERATED, `${type.id}.md`), 'utf8');
      const own = text.slice(0, text.includes('## Subtypes') ? text.indexOf('## Subtypes') : undefined);
      const shown = Object.fromEntries(fieldRows(own).map(([name, kind]) => [name.replace(/`/g, ''), kind.endsWith(', required')]));
      expect(shown, type.id).toEqual(
        Object.fromEntries(
          Object.entries(type.fields).flatMap(([name, field]) => [
            [name, field.required === true],
            ...Object.entries(field.items_fields ?? {}).map(([member, entry]) => [`${name}[].${member}`, entry.required === true]),
          ]),
        ),
      );
    }
  });
});

describe('the edge type table', () => {
  const table = readFileSync(path.join(GENERATED, 'edge-types.md'), 'utf8');
  const lines = table.trimEnd().split('\n');
  const cells = (line: string) => line.split('|').slice(1, -1).map((cell) => cell.trim());
  const header = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  const edgesPage = PAGES.find((page) => page.slug === 'edges')!.text;

  /** The contract's wording for an end of an edge type. */
  function wording(constraints: string[]): string {
    if (constraints[0] === '*') return 'Any type';
    return constraints
      .map((value) => (value.startsWith('role:') ? `Any type with the role \`${value.slice(5)}\`` : `\`${value}\``))
      .join(' or ');
  }

  it('has a row for each edge type, in the catalog\'s order, with the contract\'s wording', () => {
    const constrained = catalog.edge_types.some((edge) => edge.source_type_constraints[0] !== '*');
    expect(header).toEqual([
      'Edge type',
      'Label',
      'Reverse label',
      'Reverse name',
      'Cardinality',
      'On delete',
      ...(constrained ? ['Source types'] : []),
      'Target types',
    ]);
    expect(rows).toEqual(
      catalog.edge_types.map((edge) => [
        `\`${edge.id}\``,
        edge.label,
        edge.reverse_label ?? edge.label,
        edge.reverse_name ? `\`${edge.reverse_name}\`` : 'None',
        `\`${edge.cardinality}\``,
        `\`${edge.cascade_on_delete}\``,
        ...(constrained ? [wording(edge.source_type_constraints)] : []),
        wording(edge.target_type_constraints),
      ]),
    );
  });

  it('writes a cardinality as code with plain hyphens, so one line holds it and the Markdown copy matches the contract and the API', () => {
    for (const row of rows) expect(row[4]).toMatch(/^`(one|many)-to-(one|many)`$/);
  });

  it('is included by the Edges page, which says that any type is a source exactly when the table has no column for it', () => {
    expect(edgesPage).toContain('<include cwd>src/generated/catalog/edge-types.md</include>');
    const sentence = 'Every shipped edge type takes any type as its source';
    expect(edgesPage.includes(sentence)).toBe(!header.includes('Source types'));
  });
});

describe('the example check', () => {
  const sample = {
    type: 'core.media.article',
    properties: { title: 'A title', body: 'Some text', word_count: 120, published_at: '2026-05-12T08:00:00Z' },
  };

  it('accepts a valid item', () => {
    expect(exampleErrors(catalog.types, sample)).toEqual([]);
  });

  it('refuses what a create request would', () => {
    const cases: [string, unknown, string][] = [
      ['a type nothing ships', { ...sample, type: 'core.recipe' }, 'is not a shipped type'],
      ['a missing required field', { type: sample.type, properties: { body: 'Some text' } }, 'title is required by core.media.article'],
      ['a field the type lacks', { ...sample, properties: { ...sample.properties, colour: 'red' } }, 'colour is not a field of core.media.article'],
      ['a string where a whole number goes', { ...sample, properties: { ...sample.properties, word_count: '120' } }, 'word_count is not a whole number'],
      ['a fraction where a whole number goes', { ...sample, properties: { ...sample.properties, word_count: 1.5 } }, 'word_count is not a whole number'],
      ['a date and time with no zone', { ...sample, properties: { ...sample.properties, published_at: '2026-05-12T08:00:00' } }, 'published_at is not a date'],
      ['a day the calendar lacks', { ...sample, properties: { ...sample.properties, published_at: '2026-02-30' } }, 'names a day the calendar lacks'],
      ['an address that is not a URL', { ...sample, properties: { ...sample.properties, url: 'example.com' } }, 'url is not a URL'],
      ['a key a create request lacks', { ...sample, colour: 'red' }, 'colour is not a field of a create request'],
      ['properties that are a list', { type: sample.type, properties: [] }, 'has no properties object'],
    ];
    for (const [, example, expected] of cases) {
      expect(exampleErrors(catalog.types, example).join('\n')).toContain(expected);
    }
  });

  it('holds an enum, a list and a flag to their kinds', () => {
    const series = { type: 'core.media.series', properties: { title: 'A show', medium: 'tv', status: 'ongoing' } };
    expect(exampleErrors(catalog.types, series)).toEqual([]);
    expect(exampleErrors(catalog.types, { ...series, properties: { ...series.properties, medium: 'cinema' } }).join()).toContain('medium is not one of');
    const message = { type: 'core.message', properties: { body: 'Hi', from: 'a@example.com', to: ['b@example.com'] } };
    expect(exampleErrors(catalog.types, message)).toEqual([]);
    expect(exampleErrors(catalog.types, { ...message, properties: { ...message.properties, to: [7] } }).join()).toContain('element 0');
    const file = { type: 'core.file', properties: { blob_ref: 'sha256:00', mime_type: 'text/plain', executable: 'no' } };
    expect(exampleErrors(catalog.types, file).join()).toContain('executable is not true or false');
  });

  it('fails a page with no example, an example that is not JSON, or one under another heading', () => {
    expect(pageExampleErrors(catalog.types, '---\ntitle: X\n---\n\nText.\n')).toEqual(['has no JSON block under "## Example"']);
    expect(pageExampleErrors(catalog.types, '## Example\n\n```json\n{ nope }\n```\n').join()).toContain('is not JSON');
    expect(pageExampleErrors(catalog.types, '## Other\n\n```json\n' + JSON.stringify(sample) + '\n```\n')).toEqual([
      'has no JSON block under "## Example"',
    ]);
    expect(pageExampleErrors(catalog.types, '## Example\n\n```json\n' + JSON.stringify(sample) + '\n```\n')).toEqual([]);
  });

  it('reads the block under "## Example" and not a heading-shaped line inside a fence', () => {
    const page = ['```text', '## Example', '```', '', '## Example', '', '```json', '{ "a": 1 }', '```'].join('\n');
    expect(exampleBlock(page)).toBe('{ "a": 1 }');
  });
});

describe('the Field kinds page', () => {
  const page = PAGES.find((candidate) => candidate.slug === 'field-kinds')!.text;
  // A kind is a table row's first cell in the Kinds section; the other tables name keys and formats.
  const section = page.split(/^## Kinds$/m)[1]?.split(/^## /m)[0] ?? '';
  const kinds = [...section.matchAll(/^\|\s*`([a-z]+)`\s*\|/gm)].map((match) => match[1]);

  it('lists every field kind the catalog names, once', () => {
    expect(kinds.length).toBeGreaterThan(0);
    expect([...kinds].sort()).toEqual([...catalog.field_types].sort());
  });

  it('names every format that a shipped field uses', () => {
    const formats = new Set(
      catalog.types.flatMap((type) => Object.values(type.fields).flatMap((field) => (field.format ? [field.format] : []))),
    );
    expect(formats.size).toBeGreaterThan(0);
    for (const format of formats) expect(page).toContain(`\`${format}\``);
  });
});

// ── Links ────────────────────────────────────────────────────────────────

// A link to a contract chapter, or to one rule in it.
const RULE_LINK = /github\.com\/withmarfa\/marfa\/blob\/main\/conformance\/spec\/([a-z-]+)\.md(?:#([a-z0-9-]+))?/g;

// The pages that set out rules name the chapters behind them in a footer, in place of a link on each rule.
describe('the rule pages', () => {
  it.each(['type-rules', 'display-hints', 'field-kinds'])('%s ends with a footer naming the contract chapters behind its rules', (name) => {
    const text = PAGES.find((candidate) => candidate.slug === name)!.text;
    const footer = text.trimEnd().split('\n').at(-1)!;
    expect(footer).toMatch(/^The rules behind this page are in /);
    expect([...footer.matchAll(RULE_LINK)].length).toBeGreaterThan(0);
  });
});

describe('the links', () => {
  it('point at rules the contract holds', () => {
    const anchors = new Map<string, Set<string>>(
      Object.entries(contractIndex.chapters).map(([chapter, rules]) => [chapter, new Set(Object.keys(rules).map((id) => id.replace('/', '')))]),
    );
    const found: string[] = [];
    const missing: string[] = [];
    for (const { file, text } of PAGES) {
      for (const [, chapter, anchor] of text.matchAll(RULE_LINK)) {
        found.push(anchor ? `${chapter}#${anchor}` : chapter);
        if (!anchors.has(chapter) || (anchor && !anchors.get(chapter)?.has(anchor))) missing.push(`${file}: ${chapter}${anchor ? `#${anchor}` : ''}`);
      }
    }
    expect(found.length).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  /** A heading's id, as the site gives it. */
  const slug = (heading: string) => {
    const custom = /\s*\[#([^\]\s]+)\]$/.exec(heading);
    if (custom) return custom[1];
    return heading
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-');
  };

  /** The ids of the headings on a page, with those of the files it includes. */
  function headingIds(file: string): Set<string> | undefined {
    const absolute = path.join(ROOT, file);
    if (!existsSync(absolute)) return undefined;
    const text = readFileSync(absolute, 'utf8');
    const included = [...text.matchAll(/<include cwd>([^<#]+)(?:#[^<]*)?<\/include>/g)].map((match) =>
      readFileSync(path.join(ROOT, match[1]), 'utf8'),
    );
    const ids = new Set<string>();
    for (const source of [text, ...included]) {
      let fence = false;
      for (const line of source.split('\n')) {
        if (/^\s*(```|~~~)/.test(line)) fence = !fence;
        const heading = !fence && /^#{1,6}\s+(.*?)\s*$/.exec(line);
        if (heading) ids.add(slug(heading[1]));
      }
    }
    return ids;
  }

  it('reach a heading on the page they name, from the pages, from the generated files they include and from every page that links to the Catalog', () => {
    const elsewhere = (readdirSync(CONTENT, { recursive: true }) as string[])
      .filter((file) => file.endsWith('.mdx') && !file.startsWith('catalog'))
      .map((file) => ({ file: `content/docs/${file}`, text: readFileSync(path.join(CONTENT, file), 'utf8') }))
      .filter(({ text }) => text.includes('](/catalog'));
    const sources = [
      ...PAGES.map(({ file, text }) => ({ file, text })),
      ...elsewhere,
      ...readdirSync(GENERATED)
        .filter((file) => file.endsWith('.md'))
        .map((file) => ({ file: `src/generated/catalog/${file}`, text: readFileSync(path.join(GENERATED, file), 'utf8') })),
    ];
    let checked = 0;
    const broken: string[] = [];
    for (const { file, text } of sources) {
      for (const [, target, id] of text.matchAll(/\]\((\/[a-z0-9/-]+)#([a-z0-9-]+)\)/g)) {
        if (!file.includes('/catalog/') && !target.startsWith('/catalog')) continue;
        const page = target.startsWith('/catalog')
          ? PAGES.find((candidate) => candidate.slug === (target.split('/').at(-1) === 'catalog' ? 'index' : target.split('/').at(-1)))?.file ?? target
          : /^\/(build|run)\//.test(target)
            ? `content/docs${target}.mdx`
            : ['(start)', '(reference)'].map((group) => `content/docs/${group}${target}.mdx`).find((file) => existsSync(path.join(ROOT, file))) ?? target;
        const ids = headingIds(page);
        checked += 1;
        if (!ids?.has(id)) broken.push(`${file}: ${target}#${id}`);
      }
    }
    expect(checked).toBeGreaterThan(5);
    expect(broken).toEqual([]);
  });
});
