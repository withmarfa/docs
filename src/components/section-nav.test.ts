import { describe, expect, it } from 'vitest';
import { sectionFor } from './section-nav';

describe('sectionFor', () => {
  it('puts each page in the tab its folder belongs to', () => {
    expect(sectionFor('/')).toBe('Start');
    expect(sectionFor('/connect-your-agent')).toBe('Start');
    expect(sectionFor('/files')).toBe('Start');
    expect(sectionFor('/glossary')).toBe('Start');
    expect(sectionFor('/build')).toBe('Build');
    expect(sectionFor('/build/swift-app')).toBe('Build');
    expect(sectionFor('/run')).toBe('Run');
    expect(sectionFor('/run/deploy')).toBe('Run');
    expect(sectionFor('/catalog')).toBe('Catalog');
    expect(sectionFor('/catalog/media')).toBe('Catalog');
    expect(sectionFor('/agents-cli-and-mcp')).toBe('Start');
    expect(sectionFor('/reference')).toBe('Reference');
    expect(sectionFor('/cli')).toBe('Reference');
    expect(sectionFor('/marfa-mcp-server')).toBe('Reference');
    expect(sectionFor('/docs-for-agents')).toBe('Reference');
    expect(sectionFor('/folder-sync-status')).toBe('Reference');
    expect(sectionFor('/typescript-sdk')).toBe('Reference');
    expect(sectionFor('/changelog')).toBe('Reference');
    expect(sectionFor('/api-reference')).toBe('Reference');
    expect(sectionFor('/api-reference/items/getItem')).toBe('Reference');
  });

  it('leaves a path that only starts like a Reference page in Start', () => {
    expect(sectionFor('/client')).toBe('Start');
    expect(sectionFor('/clix')).toBe('Start');
    expect(sectionFor('/buildx')).toBe('Start');
    expect(sectionFor('/running')).toBe('Start');
    expect(sectionFor('/catalogx')).toBe('Start');
  });
});
