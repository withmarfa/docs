import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { checkDescription } from '../../scripts/check-pr-description';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const TEMPLATE = `## Summary

<!-- What changed and why. -->

## Changes

-

## Testing

<!-- How this was tested. -->

## Notes for reviewers

<!-- Trade-offs. -->

## Checklist

- [ ] The title is a scoped Conventional Commit.
- [ ] Docs, comments and the contract still say what is true after this change.
`;

const FILLED = `## Summary

Requires the template.

## Changes

- Adds the check.

## Testing

Ran the tests.

## Notes for reviewers

<!-- none -->

## Checklist

- [x] The title is a scoped Conventional Commit.
- [X] Docs, comments and the contract still say what is true after this change.
`;

describe('checkDescription', () => {
  it('passes a filled description, with Windows line endings too', () => {
    expect(checkDescription(FILLED)).toEqual([]);
    expect(checkDescription(FILLED.replace(/\n/g, '\r\n'))).toEqual([]);
  });

  it('names each unfilled section and unticked box in the empty template', () => {
    expect(checkDescription(TEMPLATE)).toEqual([
      '"## Summary" has no content.',
      '"## Changes" has no content.',
      '"## Testing" has no content.',
      'Checklist box not ticked: The title is a scoped Conventional Commit.',
      'Checklist box not ticked: Docs, comments and the contract still say what is true after this change.',
    ]);
  });

  it.each([null, undefined, '', 'Fixes the thing.'])('fails %j, which has no headings', (body) => {
    expect(checkDescription(body)).toHaveLength(5);
  });

  it('does not count a heading hidden in a comment', () => {
    const body = FILLED.replace('## Testing', '<!--\n## Testing\n-->\n## Elsewhere');
    expect(checkDescription(body)).toEqual(['The "## Testing" heading is missing.']);
  });
});

describe('the script, as the workflow runs it', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'pr-description-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  function run(body: string) {
    const event = path.join(dir, 'event.json');
    writeFileSync(event, JSON.stringify({ pull_request: { body } }));
    return spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/check-pr-description.ts'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_EVENT_PATH: event },
    });
  }

  it('exits zero for a filled description', () => {
    expect(run(FILLED).status).toBe(0);
  });

  it('exits non-zero with one annotation per problem for the template', () => {
    const result = run(TEMPLATE);
    expect(result.status).toBe(1);
    expect(result.stdout.match(/^::error title=/gm)).toHaveLength(5);
  });
});
