#!/usr/bin/env node
/**
 * Lists the hand-written pages that cite something which changed between two
 * commits of this repository, so a docs pass knows which pages to read again.
 *
 *   node --experimental-strip-types scripts/staleness-report.ts <base> <head>
 *
 * It compares `src/generated/contract-index.json` and `openapi.json` at the two
 * commits, then scans every page under `content/docs/` at `<head>` for the
 * three ways a page cites them (STYLE.md, "Truth"):
 *
 *   - a rule, by a link to its heading in the contract chapter;
 *   - a chapter, by the same link without a heading;
 *   - an operation, by a link to its page in the API reference.
 *
 * The output is a Markdown report on stdout. It is a list for a person or an
 * agent to read, never a request to write: a page it names may need no change.
 * Only node built-ins are used, so it runs without installing anything.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// ── The two sources ──────────────────────────────────────────────────────

/** Rule IDs and the hash of their statements, grouped by chapter. */
export interface ContractIndex {
  chapters: Record<string, Record<string, string>>;
}

export function isContractIndex(value: unknown): value is ContractIndex {
  if (typeof value !== 'object' || value === null) return false;
  const chapters = (value as { chapters?: unknown }).chapters;
  if (typeof chapters !== 'object' || chapters === null) return false;
  return Object.values(chapters).every(
    (rules) =>
      typeof rules === 'object' &&
      rules !== null &&
      Object.values(rules).every((hash) => typeof hash === 'string'),
  );
}

export interface ChapterChange {
  chapter: string;
  changed: string[];
  removed: string[];
  added: string[];
}

export interface ContractDiff {
  /** Rules whose statement changed. */
  changed: Set<string>;
  /** Rules in the base that the head no longer has. */
  removed: Set<string>;
  /** Every rule ID either side has, by chapter, to resolve a link's anchor. */
  known: Map<string, Set<string>>;
  /** Every chapter in which a rule changed, went away or arrived. */
  chapters: Map<string, ChapterChange>;
}

export function diffContract(base: ContractIndex, head: ContractIndex): ContractDiff {
  const changed = new Set<string>();
  const removed = new Set<string>();
  const known = new Map<string, Set<string>>();
  const chapters = new Map<string, ChapterChange>();

  const touch = (chapter: string, id: string, kind: 'changed' | 'removed' | 'added') => {
    let entry = chapters.get(chapter);
    if (!entry) {
      entry = { chapter, changed: [], removed: [], added: [] };
      chapters.set(chapter, entry);
    }
    entry[kind].push(id);
  };

  const names = new Set([...Object.keys(base.chapters), ...Object.keys(head.chapters)]);
  for (const chapter of [...names].sort()) {
    const before = base.chapters[chapter] ?? {};
    const after = head.chapters[chapter] ?? {};
    known.set(chapter, new Set([...Object.keys(before), ...Object.keys(after)]));
    for (const [id, hash] of Object.entries(before)) {
      if (!(id in after)) {
        removed.add(id);
        touch(chapter, id, 'removed');
      } else if (after[id] !== hash) {
        changed.add(id);
        touch(chapter, id, 'changed');
      }
    }
    for (const id of Object.keys(after)) if (!(id in before)) touch(chapter, id, 'added');
  }
  return { changed, removed, known, chapters };
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function resolvePointer(root: unknown, ref: string): unknown {
  if (!ref.startsWith('#/')) return undefined;
  let node: unknown = root;
  for (const part of ref.slice(2).split('/')) {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** Every `$ref` string in a value. */
function refsIn(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) refsIn(item, into);
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string') into.add(item);
      else refsIn(item, into);
    }
  }
}

/**
 * A fingerprint for each operation, by `operationId`.
 *
 * An operation object names its request and response shapes by `$ref`, so the
 * object alone does not change when a field is added to a shape. The
 * fingerprint therefore covers the method, the path, the operation object, the
 * path's shared parameters and every schema, parameter or response the
 * operation reaches through a `$ref`, however deep.
 */
export function fingerprintOperations(spec: unknown): Map<string, string> {
  const result = new Map<string, string>();
  const paths = (spec as { paths?: Record<string, Record<string, unknown>> } | null)?.paths;
  if (typeof paths !== 'object' || paths === null) return result;

  for (const [path, item] of Object.entries(paths)) {
    if (typeof item !== 'object' || item === null) continue;
    for (const method of METHODS) {
      const operation = item[method];
      if (typeof operation !== 'object' || operation === null) continue;
      const id = (operation as { operationId?: unknown }).operationId;
      if (typeof id !== 'string') continue;

      const own: Json = { method, path, operation, shared: item.parameters ?? null } as Json;
      const reached: Record<string, unknown> = {};
      const queue = new Set<string>();
      refsIn(own, queue);
      for (const ref of queue) {
        if (ref in reached) continue;
        const target = resolvePointer(spec, ref);
        reached[ref] = target ?? null;
        refsIn(target, queue);
      }
      result.set(id, createHash('sha256').update(stable({ own, reached })).digest('hex'));
    }
  }
  return result;
}

export interface OperationDiff {
  changed: Set<string>;
  removed: Set<string>;
}

export function diffOperations(
  base: Map<string, string>,
  head: Map<string, string>,
): OperationDiff {
  const changed = new Set<string>();
  const removed = new Set<string>();
  for (const [id, fingerprint] of base) {
    const after = head.get(id);
    if (after === undefined) removed.add(id);
    else if (after !== fingerprint) changed.add(id);
  }
  return { changed, removed };
}

// ── Citations ────────────────────────────────────────────────────────────

export interface Citations {
  /** Links to a rule's heading, as the chapter and the anchor. */
  rules: { chapter: string; anchor: string }[];
  /** Links to a chapter with no heading, or with one that is not a rule. */
  chapters: string[];
  /** Operation IDs from links into the API reference. */
  operations: string[];
}

const CONTRACT_LINK =
  /https:\/\/github\.com\/withmarfa\/marfa\/blob\/[^/\s)"'<>]+\/conformance\/spec\/([a-z0-9-]+)\.md(?:#([A-Za-z0-9_-]+))?/g;
const OPERATION_LINK = /\/api-reference\/[a-z0-9-]+\/([A-Za-z0-9_]+)/g;

/** What a page cites. A rule's anchor is its ID without the slash. */
export function scanCitations(mdx: string): Citations {
  const rules: Citations['rules'] = [];
  const chapters = new Set<string>();
  for (const match of mdx.matchAll(CONTRACT_LINK)) {
    const [, chapter, anchor] = match;
    if (anchor) rules.push({ chapter, anchor });
    else chapters.add(chapter);
  }
  const operations = new Set<string>();
  for (const match of mdx.matchAll(OPERATION_LINK)) operations.add(match[1]);
  return { rules, chapters: [...chapters], operations: [...operations] };
}

// ── Findings ─────────────────────────────────────────────────────────────

export interface PageFinding {
  path: string;
  rulesChanged: string[];
  rulesRemoved: string[];
  operationsChanged: string[];
  operationsRemoved: string[];
}

export interface ChapterFinding {
  path: string;
  chapters: ChapterChange[];
}

export interface Findings {
  pages: PageFinding[];
  chapterPages: ChapterFinding[];
}

export interface Comparison {
  /** Absent when the contract index could not be compared. */
  contract?: ContractDiff;
  /** Absent when the API description could not be compared. */
  operations?: OperationDiff;
}

const sorted = (set: Iterable<string>) => [...set].sort();

export function findStale(pages: Record<string, string>, comparison: Comparison): Findings {
  const { contract, operations } = comparison;
  const findings: Findings = { pages: [], chapterPages: [] };

  for (const path of Object.keys(pages).sort()) {
    const cited = scanCitations(pages[path]);
    const rulesChanged = new Set<string>();
    const rulesRemoved = new Set<string>();
    const chapters = new Set<string>();
    const operationsChanged = new Set<string>();
    const operationsRemoved = new Set<string>();

    if (contract) {
      for (const { chapter, anchor } of cited.rules) {
        const id = [...(contract.known.get(chapter) ?? [])].find(
          (known) => known.replace('/', '') === anchor,
        );
        // A link to a heading that is not a rule cites the chapter as a whole.
        if (id === undefined) chapters.add(chapter);
        else if (contract.removed.has(id)) rulesRemoved.add(id);
        else if (contract.changed.has(id)) rulesChanged.add(id);
      }
      for (const chapter of cited.chapters) chapters.add(chapter);
    }
    if (operations) {
      for (const id of cited.operations) {
        if (operations.removed.has(id)) operationsRemoved.add(id);
        else if (operations.changed.has(id)) operationsChanged.add(id);
      }
    }

    if (rulesChanged.size + rulesRemoved.size + operationsChanged.size + operationsRemoved.size > 0) {
      findings.pages.push({
        path,
        rulesChanged: sorted(rulesChanged),
        rulesRemoved: sorted(rulesRemoved),
        operationsChanged: sorted(operationsChanged),
        operationsRemoved: sorted(operationsRemoved),
      });
    }
    const touched = sorted(chapters)
      .map((chapter) => contract?.chapters.get(chapter))
      .filter((change): change is ChapterChange => change !== undefined);
    if (touched.length > 0) findings.chapterPages.push({ path, chapters: touched });
  }
  return findings;
}

// ── The report ───────────────────────────────────────────────────────────

const codes = (ids: string[]) => ids.map((id) => `\`${id}\``).join(', ');

function chapterLine(change: ChapterChange): string {
  const counts = [
    change.changed.length > 0 ? `${change.changed.length} changed` : '',
    change.removed.length > 0 ? `${change.removed.length} removed` : '',
    change.added.length > 0 ? `${change.added.length} added` : '',
  ].filter(Boolean);
  const ids = [...change.changed, ...change.removed, ...change.added];
  const shown = ids.slice(0, 5);
  const more = ids.length > shown.length ? `, and ${ids.length - shown.length} more` : '';
  return `\`${change.chapter}\`: ${counts.join(', ')} (${codes(shown)}${more})`;
}

export function renderReport(
  base: string,
  head: string,
  findings: Findings,
  notes: string[] = [],
): string {
  const out: string[] = [
    '## Docs staleness report',
    '',
    `Compared \`${base}\` with \`${head}\`. Each page below cites something that changed. Reading it again is the task: "no change needed" is a normal answer.`,
    '',
  ];
  for (const note of notes) out.push(`- ${note}`);
  if (notes.length > 0) out.push('');

  if (findings.pages.length === 0 && findings.chapterPages.length === 0) {
    out.push('No hand-written page cites a rule or an operation that changed.');
    return `${out.join('\n')}\n`;
  }

  for (const page of findings.pages) {
    out.push(`### \`${page.path}\``, '');
    if (page.rulesChanged.length > 0) out.push(`- Rule changed: ${codes(page.rulesChanged)}`);
    if (page.rulesRemoved.length > 0) out.push(`- Rule removed: ${codes(page.rulesRemoved)}`);
    if (page.operationsChanged.length > 0) out.push(`- Operation changed: ${codes(page.operationsChanged)}`);
    if (page.operationsRemoved.length > 0) out.push(`- Operation removed: ${codes(page.operationsRemoved)}`);
    out.push('');
  }
  if (findings.pages.length === 0) out.push('No page cites a changed rule or operation by name.', '');

  if (findings.chapterPages.length > 0) {
    out.push(
      '### Chapter changed',
      '',
      'These pages link to a whole chapter in which a rule changed. They are lower priority: the changed rule may have nothing to do with the page.',
      '',
    );
    for (const page of findings.chapterPages) {
      out.push(`- \`${page.path}\``);
      for (const change of page.chapters) out.push(`  - ${chapterLine(change)}`);
    }
    out.push('');
  }
  return `${out.join('\n').trimEnd()}\n`;
}

// ── Reading git ──────────────────────────────────────────────────────────

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

type Read<T> = { value: T } | { problem: string };

function readJson(ref: string, path: string): Read<unknown> {
  let text: string;
  try {
    text = git(['show', `${ref}:${path}`]);
  } catch {
    return { problem: `\`${path}\` does not exist at \`${ref}\`` };
  }
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { problem: `\`${path}\` at \`${ref}\` is not valid JSON` };
  }
}

function compareSources(base: string, head: string): { comparison: Comparison; notes: string[] } {
  const comparison: Comparison = {};
  const notes: string[] = [];

  const before = readJson(base, 'src/generated/contract-index.json');
  const after = readJson(head, 'src/generated/contract-index.json');
  if ('problem' in before || 'problem' in after) {
    const problem = 'problem' in before ? before.problem : (after as { problem: string }).problem;
    notes.push(`Rules were not compared: ${problem}.`);
  } else if (!isContractIndex(before.value) || !isContractIndex(after.value)) {
    notes.push('Rules were not compared: a contract index does not have the expected shape.');
  } else {
    comparison.contract = diffContract(before.value, after.value);
  }

  const specBefore = readJson(base, 'openapi.json');
  const specAfter = readJson(head, 'openapi.json');
  if ('problem' in specBefore || 'problem' in specAfter) {
    const problem = 'problem' in specBefore ? specBefore.problem : (specAfter as { problem: string }).problem;
    notes.push(`Operations were not compared: ${problem}.`);
  } else {
    comparison.operations = diffOperations(
      fingerprintOperations(specBefore.value),
      fingerprintOperations(specAfter.value),
    );
  }
  return { comparison, notes };
}

function readPages(head: string): Record<string, string> {
  const files = git(['ls-tree', '-r', '--name-only', head, '--', 'content/docs'])
    .split('\n')
    .filter((file) => file.endsWith('.mdx'));
  const pages: Record<string, string> = {};
  for (const file of files) pages[file] = git(['show', `${head}:${file}`]);
  return pages;
}

function main(argv: string[]): number {
  const [base, head] = argv;
  if (!base || !head || argv.length !== 2) {
    process.stderr.write('Usage: staleness-report.ts <base-ref> <head-ref>\n');
    return 2;
  }
  const { comparison, notes } = compareSources(base, head);
  const findings = findStale(readPages(head), comparison);
  process.stdout.write(renderReport(base, head, findings, notes));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
