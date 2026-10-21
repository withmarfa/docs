import { describe, expect, it } from 'vitest';
import { translations } from './translations';

const packages = [
  'fumadocs-openapi/dist',
  'fumadocs-openapi/dist/packages/shared-api/dist',
  'fumadocs-ui/dist',
];

async function packageKeys(): Promise<string[]> {
  const lists = await Promise.all(
    packages.map(
      async (name) =>
        (
          await import(
            /* @vite-ignore */ new URL(
              `../../node_modules/${name}/.translations/keys.js`,
              import.meta.url,
            ).href
          )
        ).default as string[],
    ),
  );
  return lists.flat();
}

// A label with a later word that starts with a capital is in title case, unless
// the word is a name: Markdown, GitHub, OpenID and the like.
const NAMES_AND_TEXT = new Set([
  'Check the server URL. If the API does not allow cross-origin requests from this site, a proxy is needed.(playground result display)',
  'Copied Markdown(page actions)',
  'Copy Markdown(page actions)',
  'Edit on GitHub(edit page)',
  'OpenID Connect(security scheme)',
  'Open in ChatGPT(page actions)',
  'Open in Claude(page actions)',
  'Open in Cursor(page actions)',
  'Open in GitHub(page actions)',
  'Open in Scira AI(page actions)',
  'Send as Basic Auth header(OAuth dialog)',
  'Send the client ID and secret in the Authorization header.(OAuth dialog)',
  'Use the {name} type in TypeScript.(TypeScript definitions)',
  'View as Markdown(page actions)',
]);

function isTitleCase(key: string): boolean {
  const text = key.replace(/(\([^)]*\))+$/, '');
  return text
    .split(' ')
    .slice(1)
    .some((word) => /^[A-Z][a-z]/.test(word));
}

describe('translations', () => {
  it('has a sentence-case label for every title-case label in Fumadocs', async () => {
    const missing = (await packageKeys()).filter(
      (key) => isTitleCase(key) && !NAMES_AND_TEXT.has(key) && !(key in translations),
    );
    expect(missing).toEqual([]);
  });

  it('names only labels that Fumadocs still has', async () => {
    const keys = new Set(await packageKeys());
    expect(Object.keys(translations).filter((key) => !keys.has(key))).toEqual([]);
  });

  it('gives sentence case: only the first word is capitalized', () => {
    const wrong = Object.entries(translations).filter(([, value]) =>
      value
        .split(' ')
        .slice(1)
        .some((word) => /^[A-Z][a-z]/.test(word)),
    );
    expect(wrong).toEqual([]);
  });
});
