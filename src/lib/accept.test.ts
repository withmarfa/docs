import { describe, expect, it } from 'vitest';
import { prefersMarkdown } from './accept';

describe('prefersMarkdown', () => {
  it.each([
    ['text/markdown'],
    ['text/markdown, text/html'],
    ['text/markdown, text/html, */*'],
    ['TEXT/Markdown'],
    ['text/html;q=0.5, text/markdown'],
    ['text/markdown;q=0.9, text/html;q=0.8'],
    ['text/markdown, */*;q=0.1'],
    ['application/json, text/markdown'],
    ['text/markdown;q=0.5, text/html;q=0.5, */*'],
  ])('asks for Markdown: %s', (accept) => {
    expect(prefersMarkdown(accept)).toBe(true);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['*/*'],
    ['text/*'],
    ['text/html'],
    ['text/html, text/markdown'],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
    ['text/markdown;q=0'],
    ['text/markdown;q=0.5, text/html'],
    ['application/json'],
    ['text/markdownish'],
    ['markdown'],
  ])('does not: %s', (accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });

  it('lets the exact range decide over a wildcard', () => {
    expect(prefersMarkdown('text/markdown;q=0, */*')).toBe(false);
    expect(prefersMarkdown('text/html;q=0, */*')).toBe(true);
    expect(prefersMarkdown('text/html;q=0, text/markdown')).toBe(true);
  });

  it('ignores a malformed range and a malformed quality value', () => {
    expect(prefersMarkdown('text/markdown;q=high, text/html')).toBe(false);
    expect(prefersMarkdown(',,;;, text/markdown')).toBe(true);
  });
});
