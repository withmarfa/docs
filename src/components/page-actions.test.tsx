// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FrameworkProvider } from 'fumadocs-core/framework';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageActions } from './page-actions';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the Copy Markdown button', () => {
  it('is named Copy Markdown, and says Copied Markdown in a polite live region once it has copied, at every width', async () => {
    vi.stubGlobal('fetch', async () => ({ text: async () => '# A page' }));
    vi.stubGlobal('ClipboardItem', class { constructor(readonly items: unknown) {} });
    const write = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { write, writeText: write }, configurable: true });

    act(() =>
      root.render(
        <FrameworkProvider usePathname={() => '/page'} useRouter={() => ({ push() {}, refresh() {} })} useParams={() => ({})}>
          <PageActions markdownUrl="/page.md" />
        </FrameworkProvider>,
      ),
    );
    const button = container.querySelector<HTMLButtonElement>('button[title="Copy Markdown"]')!;
    expect(button.getAttribute('aria-live')).toBe('polite');
    expect(button.textContent).toBe('Copy Markdown');

    await act(async () => {
      button.click();
    });
    expect(write).toHaveBeenCalled();
    expect(button.textContent).toBe('Copied Markdown');
    expect(button.getAttribute('aria-live')).toBe('polite');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(button.textContent).toBe('Copy Markdown');
  });
});
