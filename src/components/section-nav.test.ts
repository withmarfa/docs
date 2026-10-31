import { describe, expect, it } from 'vitest';
import { sectionFor } from './section-nav';

describe('sectionFor', () => {
  it('puts each page in the tab its folder belongs to', () => {
    expect(sectionFor('/overview')).toBe('Overview');
    expect(sectionFor('/files')).toBe('Overview');
    expect(sectionFor('/glossary')).toBe('Overview');
    expect(sectionFor('/build')).toBe('Build');
    expect(sectionFor('/build/swift-app')).toBe('Build');
    expect(sectionFor('/run')).toBe('Run');
    expect(sectionFor('/run/deploy')).toBe('Run');
    expect(sectionFor('/catalog')).toBe('Catalog');
    expect(sectionFor('/catalog/media')).toBe('Catalog');
    expect(sectionFor('/agents-cli-and-mcp')).toBe('Overview');
    expect(sectionFor('/reference')).toBe('Reference');
    expect(sectionFor('/cli')).toBe('Reference');
    expect(sectionFor('/marfa-mcp-server')).toBe('Reference');
    expect(sectionFor('/docs-for-agents')).toBe('Reference');
    expect(sectionFor('/typescript-sdk')).toBe('Reference');
    expect(sectionFor('/changelog')).toBe('Reference');
    expect(sectionFor('/api-reference')).toBe('Reference');
    expect(sectionFor('/api-reference/items/getItem')).toBe('Reference');
  });

  it('leaves a path that only starts like a Reference page in the Overview', () => {
    expect(sectionFor('/client')).toBe('Overview');
    expect(sectionFor('/clix')).toBe('Overview');
    expect(sectionFor('/buildx')).toBe('Overview');
    expect(sectionFor('/running')).toBe('Overview');
    expect(sectionFor('/catalogx')).toBe('Overview');
  });
});
