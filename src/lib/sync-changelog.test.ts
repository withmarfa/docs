import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FIRST_VERSION, fetchReleases, parseVersion, selectReleases } from '../../scripts/sync-changelog';

const release = (tag: string, extra: Record<string, unknown> = {}) => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  published_at: '2026-11-02T09:30:00Z',
  html_url: `https://github.com/withmarfa/marfa/releases/tag/${tag}`,
  body: `Notes for ${tag}.`,
  ...extra,
});

describe('parseVersion', () => {
  it('reads the three numbers of a version tag, and nothing else', () => {
    expect(parseVersion('v0.0.51')).toEqual([0, 0, 51]);
    expect(parseVersion('v1.20.3')).toEqual([1, 20, 3]);
    for (const tag of ['0.0.51', 'v0.0', 'v0.0.51-rc1', 'swift-v0.0.51', 'latest']) expect(parseVersion(tag), tag).toBeNull();
  });
});

describe('selectReleases', () => {
  it('starts at the first version the page shows', () => {
    expect(FIRST_VERSION).toBe('v0.0.51');
    const tags = selectReleases([release('v0.0.50'), release('v0.0.51'), release('v0.0.52')]).map((r) => r.tag);
    expect(tags).toEqual(['v0.0.52', 'v0.0.51']);
  });

  it('puts the newest version first by its numbers, not its text or its date', () => {
    const raw = [release('v0.0.99'), release('v0.0.100', { published_at: '2026-11-01T00:00:00Z' }), release('v0.1.0'), release('v0.0.51')];
    expect(selectReleases(raw).map((r) => r.tag)).toEqual(['v0.1.0', 'v0.0.100', 'v0.0.99', 'v0.0.51']);
  });

  it('leaves out drafts, pre-releases, tags that are not versions and releases with no date', () => {
    const raw = [
      release('v0.0.60', { draft: true }),
      release('v0.0.59', { prerelease: true }),
      release('nightly'),
      release('swift-v0.0.58'),
      release('v0.0.57', { published_at: null }),
      release('v0.0.56'),
    ];
    expect(selectReleases(raw).map((r) => r.tag)).toEqual(['v0.0.56']);
  });

  it('keeps the tag, date, address and notes, with Unix line endings and no padding', () => {
    expect(selectReleases([release('v0.0.51', { body: '\r\nOne sentence.\r\n\r\n### Server\r\n- **Added:** a thing.\r\n' })])).toEqual([
      {
        tag: 'v0.0.51',
        publishedAt: '2026-11-02T09:30:00Z',
        url: 'https://github.com/withmarfa/marfa/releases/tag/v0.0.51',
        body: 'One sentence.\n\n### Server\n- **Added:** a thing.',
      },
    ]);
  });

  it('keeps a release with no notes, and answers an empty list when none qualifies', () => {
    expect(selectReleases([release('v0.0.51', { body: null })])[0].body).toBe('');
    expect(selectReleases([release('v0.0.50')])).toEqual([]);
    expect(selectReleases([])).toEqual([]);
  });

  it('refuses an answer that is not a list, so an error is never taken for "no releases"', () => {
    expect(() => selectReleases({ message: 'Bad credentials' })).toThrow('not a list');
  });

  it('takes the first version as a parameter and refuses one that is not a version', () => {
    expect(selectReleases([release('v0.0.49'), release('v0.0.50')], 'v0.0.49')).toHaveLength(2);
    expect(() => selectReleases([], 'main')).toThrow('not a vMAJOR.MINOR.PATCH');
  });
});

describe('fetchReleases', () => {
  const page = (size: number, from = 0) => Array.from({ length: size }, (_, i) => release(`v0.0.${from + i}`));
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, statusText: status === 200 ? 'OK' : 'Forbidden' });

  it('reads pages until one is short, and sends the token only when there is one', async () => {
    const seen: { url: string; authorization?: string }[] = [];
    const answers = [page(100), page(100, 100), page(3, 200)];
    const fake = (async (url: string, init: RequestInit) => {
      seen.push({ url, authorization: (init.headers as Record<string, string>).Authorization });
      return respond(answers[seen.length - 1]);
    }) as unknown as typeof fetch;

    expect(await fetchReleases(fake, 'secret')).toHaveLength(203);
    expect(seen.map((s) => s.url.slice(s.url.indexOf('?')))).toEqual(['?per_page=100&page=1', '?per_page=100&page=2', '?per_page=100&page=3']);
    expect(seen.every((s) => s.authorization === 'Bearer secret')).toBe(true);

    seen.length = 0;
    answers.splice(0, answers.length, page(1));
    await fetchReleases(fake, undefined);
    expect(seen[0].authorization).toBeUndefined();
  });

  it('fails on an error answer instead of writing an empty list', async () => {
    const fake = (async () => respond({ message: 'API rate limit exceeded' }, 403)) as unknown as typeof fetch;
    await expect(fetchReleases(fake, undefined)).rejects.toThrow('403');
  });
});

describe('the Changelog page', () => {
  it('names the first version, so its introduction stays true when the constant moves', () => {
    const page = readFileSync(fileURLToPath(new URL('../../content/docs/(reference)/changelog.mdx', import.meta.url)), 'utf8');
    expect(page).toContain(FIRST_VERSION);
  });
});
