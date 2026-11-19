// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FrameworkProvider } from 'fumadocs-core/framework';
import { TreeContextProvider } from 'fumadocs-ui/contexts/tree';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PageFooter } from './page-footer';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A tree as the loader makes it: the middle page's node is named by its
// `sidebar_label`.
const tree = {
  name: 'Docs',
  children: [
    { type: 'page', name: 'First', url: '/first', description: 'The first page.' },
    { type: 'page', name: 'Short label', url: '/second', description: 'The second page.' },
    { type: 'page', name: 'Third', url: '/third', description: 'The third page.' },
  ],
} as never;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(pathname: string, titles?: Record<string, string>) {
  act(() => {
    root.render(
      <FrameworkProvider usePathname={() => pathname} useRouter={() => ({ push() {}, refresh() {} })} useParams={() => ({})}>
        <TreeContextProvider tree={tree}>
          <PageFooter titles={titles} />
        </TreeContextProvider>
      </FrameworkProvider>,
    );
  });
  return [...container.querySelectorAll('a')].map((link) => link.textContent);
}

describe('page footer cards', () => {
  it('shows the full title of a page that has a sidebar label, not the label', () => {
    const text = render('/first', { '/second': 'The second page, with a long and tiring title' }).join(' ');
    expect(text).toContain('The second page, with a long and tiring title');
    expect(text).not.toContain('Short label');
  });

  it('falls back to the tree name for a page with no full title listed', () => {
    const text = render('/second').join(' ');
    expect(text).toContain('First');
    expect(text).toContain('Third');
  });
});
