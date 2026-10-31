#!/usr/bin/env node
/**
 * Writes the Changelog page's data from the published releases of
 * withmarfa/marfa.
 *
 *   node --experimental-strip-types scripts/sync-changelog.ts
 *
 * It reads the releases through the GitHub REST API and writes
 * `src/generated/changelog.json`: for each release from `FIRST_VERSION` on,
 * newest first, its tag, publication date, address on GitHub and notes in
 * Markdown. The notes are kept as written; the page parses them
 * (`src/lib/changelog.ts`). Drafts and pre-releases are left out.
 *
 * `GITHUB_TOKEN` is sent when set, and the script works without it. Only node
 * built-ins are used, so it runs without installing anything.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The first release the page shows. Earlier releases have notes in an older shape and stay on GitHub. */
export const FIRST_VERSION = 'v0.0.51';

const REPOSITORY = 'withmarfa/marfa';
const PAGE_SIZE = 100;
const OUTPUT = fileURLToPath(new URL('../src/generated/changelog.json', import.meta.url));

/** One release as the page needs it. */
export interface ChangelogRelease {
  tag: string;
  /** An ISO 8601 timestamp. */
  publishedAt: string;
  url: string;
  /** The release notes, in Markdown, with Unix line endings. */
  body: string;
}

/** The numbers of a `vMAJOR.MINOR.PATCH` tag, or `null` for any other tag. */
export function parseVersion(tag: string): [number, number, number] | null {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negative when `a` is the older version, positive when it is the newer. */
export function compareVersions(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/**
 * The releases the page shows, newest first, from what the API returned. A
 * draft, a pre-release, a tag that is not a version and a release before
 * `first` are left out; so is a release with no date or address.
 */
export function selectReleases(raw: unknown, first: string = FIRST_VERSION): ChangelogRelease[] {
  if (!Array.isArray(raw)) throw new Error('The releases response is not a list.');
  const start = parseVersion(first);
  if (!start) throw new Error(`The first version "${first}" is not a vMAJOR.MINOR.PATCH tag.`);

  const found: { version: [number, number, number]; release: ChangelogRelease }[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const item = entry as Record<string, unknown>;
    if (item.draft === true || item.prerelease === true) continue;
    if (typeof item.tag_name !== 'string') continue;
    const version = parseVersion(item.tag_name);
    if (!version || compareVersions(version, start) < 0) continue;
    if (typeof item.published_at !== 'string' || typeof item.html_url !== 'string') continue;
    found.push({
      version,
      release: {
        tag: item.tag_name,
        publishedAt: item.published_at,
        url: item.html_url,
        body: (typeof item.body === 'string' ? item.body : '').replace(/\r\n?/g, '\n').trim(),
      },
    });
  }
  return found.sort((a, b) => compareVersions(b.version, a.version)).map(({ release }) => release);
}

/** Every page of the repository's releases, as the API returns them. */
export async function fetchReleases(fetchPage: typeof fetch = fetch, token = process.env.GITHUB_TOKEN): Promise<unknown[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'marfa-docs-sync-changelog',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const all: unknown[] = [];
  for (let page = 1; ; page++) {
    const url = `https://api.github.com/repos/${REPOSITORY}/releases?per_page=${PAGE_SIZE}&page=${page}`;
    const response = await fetchPage(url, { headers });
    if (!response.ok) {
      throw new Error(`GET ${url} answered ${response.status} ${response.statusText}.`);
    }
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error(`GET ${url} did not answer a list.`);
    all.push(...body);
    if (body.length < PAGE_SIZE) return all;
  }
}

async function main(): Promise<number> {
  const releases = selectReleases(await fetchReleases());
  writeFileSync(OUTPUT, `${JSON.stringify(releases, null, 2)}\n`);
  process.stdout.write(
    `Wrote ${releases.length} release${releases.length === 1 ? '' : 's'} from ${FIRST_VERSION} on to src/generated/changelog.json.\n`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
