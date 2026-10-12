import { describe, expect, it } from 'vitest';
import { sectionFor } from './section-nav';

describe('sectionFor', () => {
  it('puts each page in the tab its folder belongs to', () => {
    expect(sectionFor('/overview')).toBe('Overview');
    expect(sectionFor('/files')).toBe('Overview');
    expect(sectionFor('/cli')).toBe('Tools');
    expect(sectionFor('/cli/items')).toBe('Tools');
    expect(sectionFor('/glossary')).toBe('Tools');
    expect(sectionFor('/docs-mcp-server')).toBe('Tools');
    expect(sectionFor('/guides/deploy')).toBe('Guides');
    expect(sectionFor('/api-reference')).toBe('API reference');
    expect(sectionFor('/api-reference/items/getItem')).toBe('API reference');
  });

  it('leaves a path that only starts like a Tools page in the Overview', () => {
    expect(sectionFor('/client')).toBe('Overview');
    expect(sectionFor('/guidesx')).toBe('Overview');
  });
});
