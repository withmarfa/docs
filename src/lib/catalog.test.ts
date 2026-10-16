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
}

interface CatalogType {
  id: string;
  parent?: string;
  label: string;
  description: string;
  fields: Record<string, Field>;
}

interface Catalog {
  types: CatalogType[];
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
export function valueError(field: Pick<Field, 'type' | 'enum_values' | 'items_type'>, value: unknown): string | undefined {
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

const PAGES = readdirSync(CATALOG_PAGES)
  .filter((file) => file.endsWith('.mdx'))
  .map((file) => ({
    slug: file.replace(/\.mdx$/, ''),
    file: `content/docs/catalog/${file}`,
    text: readFileSync(path.join(CATALOG_PAGES, file), 'utf8'),
  }));

const TOP_LEVEL = catalog.types.filter((type) => !type.parent);
const CORE_SLUGS = TOP_LEVEL.filter((type) => type.id.startsWith('core.')).map((type) => type.id.slice('core.'.length));
/** The pages that are not the page of one core type. */
const OTHER_PAGES = ['index', 'items', 'system-types', 'your-own-types', 'edges', 'events', 'permissions'];

describe('the catalog the pages follow', () => {
  it('is the synced copy, with the types the pages cover', () => {
    expect(catalog.types.length).toBeGreaterThan(10);
    expect(CORE_SLUGS).toContain('media');
    expect(catalog.types.find((type) => type.id === 'core.media.article')?.fields.body.required).toBe(true);
  });

  it('is read for a create request from the API description', () => {
    expect([...CREATE_KEYS]).toEqual(expect.arrayContaining(['type', 'properties']));
  });
});

describe('the tab', () => {
  it('has one page for each core type and the other pages, and no other', () => {
    expect(PAGES.map((page) => page.slug).sort()).toEqual([...CORE_SLUGS, ...OTHER_PAGES].sort());
  });

  it('puts no backtick in a description, which the page cards show as it is', () => {
    for (const { file, text } of PAGES) expect(String(frontmatter(text).description), file).not.toContain('`');
  });

  it('lists exactly those pages in its meta.json', () => {
    const meta = JSON.parse(readFileSync(path.join(CATALOG_PAGES, 'meta.json'), 'utf8'));
    expect(meta.root).toBe(true);
    const listed = meta.pages.filter((entry: string) => !entry.startsWith('---'));
    expect(listed.sort()).toEqual(PAGES.map((page) => page.slug).sort());
    expect(listed.length).toBe(new Set(listed).size);
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
      it('is titled with the type\'s label and described with its description', () => {
        const data = frontmatter(page.text);
        expect(data.title).toBe(type.label);
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

  it('shows the system types on their own page', () => {
    const system = TOP_LEVEL.filter((type) => type.id.startsWith('system.'));
    const page = PAGES.find((candidate) => candidate.slug === 'system-types')!;
    expect(system.length).toBeGreaterThan(0);
    for (const type of system) expect(page.text).toContain(`src/generated/catalog/${type.id}.md</include>`);
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
      ['a missing required field the parent does not require', { type: sample.type, properties: { title: 'A title' } }, 'body is required by core.media.article'],
      ['a field the type lacks', { ...sample, properties: { ...sample.properties, rating: 5 } }, 'rating is not a field of core.media.article'],
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

describe('the Items page', () => {
  const page = PAGES.find((candidate) => candidate.slug === 'items')!.text;
  const kinds = (() => {
    const section = page.split(/^## Field kinds\s*$/m)[1]?.split(/^## /m)[0] ?? '';
    return [...section.matchAll(/^\|\s*`([a-z]+)`\s*\|/gm)].map((match) => match[1]);
  })();

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

const RULE_LINK = /github\.com\/withmarfa\/marfa\/blob\/main\/conformance\/spec\/([a-z-]+)\.md#([a-z0-9-]+)/g;

describe('the links', () => {
  it('point at rules the contract holds', () => {
    const anchors = new Map<string, Set<string>>(
      Object.entries(contractIndex.chapters).map(([chapter, rules]) => [chapter, new Set(Object.keys(rules).map((id) => id.replace('/', '')))]),
    );
    const found: string[] = [];
    const missing: string[] = [];
    for (const { file, text } of PAGES) {
      for (const [, chapter, anchor] of text.matchAll(RULE_LINK)) {
        found.push(`${chapter}#${anchor}`);
        if (!anchors.get(chapter)?.has(anchor)) missing.push(`${file}: ${chapter}#${anchor}`);
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
        const page = `content/docs${target.startsWith('/catalog') || target.startsWith('/guides') ? target : `/(overview)${target}`}.mdx`;
        const ids = headingIds(page);
        checked += 1;
        if (!ids?.has(id)) broken.push(`${file}: ${target}#${id}`);
      }
    }
    expect(checked).toBeGreaterThan(5);
    expect(broken).toEqual([]);
  });
});
