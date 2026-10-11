#!/usr/bin/env node
/**
 * Warns about a page that a change made much longer.
 *
 *   node --experimental-strip-types scripts/page-growth.ts <base> <head>
 *
 * For each `.mdx` page under `content/docs/` that exists at both commits, it
 * compares the page's length in characters. A page that grows by more than 30%
 * and by more than 2,000 characters prints a GitHub `::warning` annotation,
 * which shows on the pull request's file. It never exits non-zero for a page:
 * a long page can be right, and the warning only asks whether the new text
 * belongs in the reference instead, or replaces something (STYLE.md, "Keeping
 * pages current").
 */

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const GROWTH_RATIO = 0.3;
export const GROWTH_CHARACTERS = 2000;

/** Whether a page grew enough to warn about: by more than both limits. */
export function grewTooMuch(before: number, after: number): boolean {
  const added = after - before;
  return added > GROWTH_CHARACTERS && added > before * GROWTH_RATIO;
}

/** A property of a workflow command escapes `%`, line breaks, `:` and `,`. */
function escapeProperty(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

function escapeData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

export function growthWarning(path: string, before: number, after: number): string {
  const percent = Math.round(((after - before) / before) * 100);
  const message =
    `This page grew from ${before} to ${after} characters (${percent} percent longer). ` +
    'Check whether the new text belongs in the API reference or the contract instead, ' +
    'or replaces something already here: STYLE.md, "Keeping pages current".';
  return `::warning file=${escapeProperty(path)}::${escapeData(message)}`;
}

/** A changed page, by its path at the head and the path it had at the base. */
export interface ChangedPage {
  path: string;
  basePath: string;
}

/** Reads `git diff --name-status -M` output, keeping modified and renamed pages. */
export function parseChangedPages(nameStatus: string): ChangedPage[] {
  const pages: ChangedPage[] = [];
  for (const line of nameStatus.split('\n')) {
    const [status, first, second] = line.split('\t');
    if (!status || !first) continue;
    const [basePath, path] = status.startsWith('R') && second ? [first, second] : [first, first];
    if (!status.startsWith('M') && !status.startsWith('R')) continue;
    if (path.startsWith('content/docs/') && path.endsWith('.mdx')) pages.push({ path, basePath });
  }
  return pages;
}

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function main(argv: string[]): number {
  const [base, head] = argv;
  if (!base || !head || argv.length !== 2) {
    process.stderr.write('Usage: page-growth.ts <base-ref> <head-ref>\n');
    return 2;
  }
  const changed = parseChangedPages(
    git(['diff', '--name-status', '-M', base, head, '--', 'content/docs']),
  );
  let warned = 0;
  for (const { path, basePath } of changed) {
    const before = git(['show', `${base}:${basePath}`]).length;
    const after = git(['show', `${head}:${path}`]).length;
    if (before > 0 && grewTooMuch(before, after)) {
      process.stdout.write(`${growthWarning(path, before, after)}\n`);
      warned++;
    }
  }
  process.stdout.write(`Checked ${changed.length} changed pages: ${warned} grew past the limit.\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
