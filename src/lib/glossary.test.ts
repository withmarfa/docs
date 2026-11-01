/**
 * Holds the Glossary page to marfa's GLOSSARY.md, which decides every term
 * (STYLE.md, "Vocabulary"). The page defines each word briefly for a reader, so
 * its text can't be compared with GLOSSARY.md's word for word. Instead,
 * `glossary-sources.json` names, for each word on the page, the GLOSSARY.md
 * row that settles it and a fingerprint of the two definitions as they were
 * when someone last read them side by side. A sync that changes the row, or
 * an edit that changes the page's definition, fails here until both are read
 * again and the fingerprint is renewed. A word with no row says why.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sources from './glossary-sources.json';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PAGE = path.join(ROOT, 'content/docs/(start)/glossary.mdx');
const GLOSSARY = path.join(ROOT, 'src/generated/GLOSSARY.md');

type Source = { glossary: string; reviewed: string } | { glossary: null; reason: string };

const entries = sources.terms as Record<string, Source>;

function rows(text: string, pattern: RegExp): Map<string, string> {
  const found = new Map<string, string>();
  for (const line of text.split('\n')) {
    const match = pattern.exec(line);
    if (match) found.set(match[1].replaceAll('`', ''), match[2].replace(/\s+/g, ' ').trim());
  }
  return found;
}

/** The rows of GLOSSARY.md's word tables, which end where "Banned" begins. */
function glossaryRows(): Map<string, string> {
  const text = readFileSync(GLOSSARY, 'utf8');
  const words = text.slice(text.indexOf('## The words'), text.indexOf('## Banned'));
  return rows(words, /^\| \*\*(.+?)\*\* +\| (.+?) +\|$/);
}

/** The page's rows, `| [**word**](/link) | meaning |`, or a row whose word has no link. */
function pageRows(): Map<string, string> {
  return rows(readFileSync(PAGE, 'utf8'), /^\| \[?\*\*(.+?)\*\*(?:\]\([^)]*\))? \| (.+) \|$/);
}

export function fingerprint(glossary: string, page: string): string {
  return createHash('sha256').update(`${glossary}\n${page}`).digest('hex').slice(0, 12);
}

describe('the Glossary page', () => {
  const glossary = glossaryRows();
  const page = pageRows();

  it('reads both tables', () => {
    expect(glossary.size).toBeGreaterThan(50);
    expect(page.size).toBeGreaterThan(40);
  });

  it('names a source for every word, and only for words on the page', () => {
    expect(Object.keys(entries).sort()).toEqual([...page.keys()].sort());
  });

  for (const [word, meaning] of page) {
    const source = entries[word];
    if (!source) continue;

    if (source.glossary === null) {
      it(`gives a reason that ${word} has no GLOSSARY.md row`, () => {
        expect(glossary.has(word), `GLOSSARY.md now has a row for ${word}; name it`).toBe(false);
        expect(source.reason.length).toBeGreaterThan(0);
      });
      continue;
    }

    it(`agrees with GLOSSARY.md on ${word}`, () => {
      const settled = glossary.get(source.glossary);
      expect(settled, `GLOSSARY.md has no row for ${source.glossary}`).toBeDefined();
      const now = fingerprint(settled!, meaning);
      expect(
        now,
        [
          `The page's definition of ${word}, or GLOSSARY.md's of ${source.glossary}, changed since they were last compared.`,
          `GLOSSARY.md: ${settled}`,
          `The page: ${meaning}`,
          `If the page already agrees, set its "reviewed" to "${now}" in src/lib/glossary-sources.json. If you change the page, run this test again and set the fingerprint it then gives.`,
        ].join('\n'),
      ).toBe(source.reviewed);
    });
  }
});
