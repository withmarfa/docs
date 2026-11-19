import { describe, expect, it } from 'vitest';
import { sectionFor } from './section-nav';

describe('sectionFor', () => {
  it('puts each page in the tab its folder belongs to', () => {
    expect(sectionFor('/')).toBe('Start');
    expect(sectionFor('/connect-your-agent')).toBe('Start');
    expect(sectionFor('/quickstart')).toBe('Start');
    expect(sectionFor('/how-marfa-works')).toBe('Start');
    expect(sectionFor('/use/from-an-agent')).toBe('Use');
    expect(sectionFor('/use/sync-a-folder')).toBe('Use');
    expect(sectionFor('/build/files')).toBe('Build');
    expect(sectionFor('/build/swift-app')).toBe('Build');
    expect(sectionFor('/run/install')).toBe('Run');
    expect(sectionFor('/run/run-on-a-server')).toBe('Run');
    expect(sectionFor('/catalog/items')).toBe('Catalog');
    expect(sectionFor('/catalog/media')).toBe('Catalog');
    expect(sectionFor('/catalog/connectors/github')).toBe('Catalog');
    expect(sectionFor('/cli')).toBe('Reference');
    expect(sectionFor('/marfa-mcp-server')).toBe('Reference');
    expect(sectionFor('/docs-mcp-server')).toBe('Reference');
    expect(sectionFor('/folder-rules')).toBe('Reference');
    expect(sectionFor('/folder-sync-status')).toBe('Reference');
    expect(sectionFor('/typescript-sdk')).toBe('Reference');
    expect(sectionFor('/api-reference')).toBe('Reference');
    expect(sectionFor('/api-reference/items/getItem')).toBe('Reference');
  });

  it('puts the pages the top bar links to in no tab', () => {
    expect(sectionFor('/glossary')).toBeNull();
    expect(sectionFor('/changelog')).toBeNull();
    expect(sectionFor('/get-help')).toBeNull();
  });

  it('leaves a path that only starts like a Reference page in Start', () => {
    expect(sectionFor('/client')).toBe('Start');
    expect(sectionFor('/clix')).toBe('Start');
    expect(sectionFor('/buildx')).toBe('Start');
    expect(sectionFor('/running')).toBe('Start');
    expect(sectionFor('/catalogx')).toBe('Start');
    expect(sectionFor('/user')).toBe('Start');
  });
});
