import { describe, expect, it } from 'vitest';
import { sectionFor } from './section-nav';

describe('sectionFor', () => {
  it('puts each page in the tab its folder belongs to', () => {
    expect(sectionFor('/')).toBe('Home');
    expect(sectionFor('/connect-your-agent')).toBe('Home');
    expect(sectionFor('/quickstart')).toBe('Home');
    expect(sectionFor('/how-marfa-works')).toBe('Home');
    expect(sectionFor('/use/from-an-agent')).toBe('Use');
    expect(sectionFor('/use/sync-a-folder')).toBe('Use');
    expect(sectionFor('/build/files')).toBe('Build');
    expect(sectionFor('/build/swift-app')).toBe('Build');
    expect(sectionFor('/run/install')).toBe('Run');
    expect(sectionFor('/run/run-on-a-server')).toBe('Run');
    expect(sectionFor('/catalog/items')).toBe('Catalog');
    expect(sectionFor('/catalog/media')).toBe('Catalog');
    expect(sectionFor('/catalog/connectors/github')).toBe('Catalog');
    expect(sectionFor('/reference/cli')).toBe('Reference');
    expect(sectionFor('/reference/marfa-mcp-server')).toBe('Reference');
    expect(sectionFor('/reference/docs-mcp-server')).toBe('Reference');
    expect(sectionFor('/reference/folder-rules')).toBe('Reference');
    expect(sectionFor('/reference/folder-sync-status')).toBe('Reference');
    expect(sectionFor('/reference/typescript-sdk')).toBe('Reference');
    expect(sectionFor('/reference/api')).toBe('Reference');
    expect(sectionFor('/reference/api/items/getItem')).toBe('Reference');
  });

  it('puts the Glossary, the Changelog and Get help in Home', () => {
    expect(sectionFor('/glossary')).toBe('Home');
    expect(sectionFor('/changelog')).toBe('Home');
    expect(sectionFor('/get-help')).toBe('Home');
  });

  it('leaves a path that only starts like another tab\'s segment in Home', () => {
    expect(sectionFor('/client')).toBe('Home');
    expect(sectionFor('/clix')).toBe('Home');
    expect(sectionFor('/buildx')).toBe('Home');
    expect(sectionFor('/running')).toBe('Home');
    expect(sectionFor('/catalogx')).toBe('Home');
    expect(sectionFor('/user')).toBe('Home');
  });
});
