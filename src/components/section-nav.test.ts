import { describe, expect, it } from 'vitest';
import { sectionFor } from './section-nav';

describe('sectionFor', () => {
  it('puts each page in the tab its folder belongs to', () => {
    expect(sectionFor('/overview')).toBe('Overview');
    expect(sectionFor('/files')).toBe('Overview');
    expect(sectionFor('/glossary')).toBe('Overview');
    expect(sectionFor('/guides/deploy')).toBe('Guides');
    expect(sectionFor('/docs-mcp-server')).toBe('Overview');
    expect(sectionFor('/cli')).toBe('Reference');
    expect(sectionFor('/typescript-sdk')).toBe('Reference');
    expect(sectionFor('/changelog')).toBe('Reference');
    expect(sectionFor('/api-reference')).toBe('Reference');
    expect(sectionFor('/api-reference/items/getItem')).toBe('Reference');
  });

  it('leaves a path that only starts like a Reference page in the Overview', () => {
    expect(sectionFor('/client')).toBe('Overview');
    expect(sectionFor('/clix')).toBe('Overview');
    expect(sectionFor('/guidesx')).toBe('Overview');
  });
});
