// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Release } from '@/lib/changelog';
import { ChangelogView } from './changelog';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const releases: Release[] = [
  {
    tag: 'v0.0.52',
    publishedAt: '2026-11-03T10:00:00Z',
    url: 'https://github.com/withmarfa/marfa/releases/tag/v0.0.52',
    body: 'A fix for the CLI.\n\n### CLI\n- **Fixed:** `marfa items list` paged twice.\n\n**Full changelog:** https://github.com/withmarfa/marfa/compare/v0.0.51...v0.0.52',
  },
  {
    tag: 'v0.0.51',
    publishedAt: '2026-11-02T10:00:00Z',
    url: 'https://github.com/withmarfa/marfa/releases/tag/v0.0.51',
    body: 'Tasks repeat.\n\n**Breaking:** send `repeat` as an object.\n\n### Server\n- **Added:** repeats. [Docs](https://docs.marfa.so/catalog/task)\n- Unsafe [link](javascript:alert(1)).\n\n### CLI\n- **Changed:** the printout.',
  },
];

describe('the changelog on the server', () => {
  const html = renderToStaticMarkup(<ChangelogView releases={releases} />);

  it('shows every release and every part, with nothing hidden', () => {
    expect(html).toContain('id="v0052"');
    expect(html).toContain('id="v0051"');
    expect(html).not.toContain(' hidden=""');
    expect(html.match(/class="marfa-cl-part"/g)).toHaveLength(3);
  });

  it('puts the version in a heading, then the date', () => {
    expect(html).toMatch(/<h2[^>]*id="v0051"[^>]*>.*v0\.0\.51.*<\/h2>/);
    expect(html).toContain('<time dateTime="2026-11-02T10:00:00Z">November 2, 2026</time>');
  });

  it('labels only the release with a Breaking paragraph, and keeps the paragraph', () => {
    expect(html.match(/marfa-cl-breaking/g)).toHaveLength(1);
    expect(html).toContain('<strong>Breaking:</strong> send <code>repeat</code> as an object.');
  });

  it('links the notes inside the site by path, and never draws an unsafe address as a link', () => {
    expect(html).toContain('href="/catalog/task"');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('Unsafe link.');
  });

  it('links the Full changelog address when the notes have one, and the release otherwise', () => {
    expect(html).toContain('href="https://github.com/withmarfa/marfa/compare/v0.0.51...v0.0.52"');
    expect(html).toContain('href="https://github.com/withmarfa/marfa/releases/tag/v0.0.51"');
  });

  it('shows nothing when there are no releases', () => {
    expect(renderToStaticMarkup(<ChangelogView releases={[]} />)).toBe('');
  });

  it('offers a filter for each part, as toggle buttons that are all off', () => {
    expect(html.match(/<button[^>]*aria-pressed="false"[^>]*>(Server|CLI)<\/button>/g)).toHaveLength(2);
  });
});

describe('the part filters', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<ChangelogView releases={releases} />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const button = (name: string) => [...container.querySelectorAll('button')].find((b) => b.textContent === name)!;
  const hiddenParts = () => [...container.querySelectorAll<HTMLElement>('.marfa-cl-part')].filter((p) => p.hidden).map((p) => p.getAttribute('aria-label'));

  it('shows only the selected parts, and every part again when none is selected', () => {
    act(() => button('Server').click());
    expect(button('Server').getAttribute('aria-pressed')).toBe('true');
    expect(hiddenParts()).toEqual(['CLI', 'CLI']);

    act(() => button('CLI').click());
    expect(hiddenParts()).toEqual([]);

    act(() => button('Server').click());
    act(() => button('CLI').click());
    expect(hiddenParts()).toEqual([]);
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it('keeps every release heading while a filter hides its parts, and says when nothing is left', () => {
    act(() => button('Server').click());
    expect(container.querySelectorAll('h2')).toHaveLength(2);
    expect(container.textContent).toContain('No changes to the selected parts.');
  });
});
