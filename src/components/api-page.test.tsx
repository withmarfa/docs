// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { source } from '@/lib/source';
import { isErrorCode, splitResponseCodes } from '@/lib/response-codes';
import { APIPage } from './api-page';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom lays nothing out and has no observer; the schema's collapse logic only
// needs one to exist.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// createItem answers with fifteen codes, the widest operation in the spec: two
// success codes and thirteen errors. The package draws a row of fifteen tabs
// unless the page's own response controls are in use, so this renders the
// real page and reads the controls it draws.
const WIDEST = '/reference/api/items/createItem';

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

async function renderPage(url: string) {
  const page = source.getPages().find((candidate) => candidate.url === url);
  if (!page || page.type !== 'openapi') throw new Error(`${url} is not an API page`);
  const props = await page.data.getOpenAPIPageProps();
  await act(async () => {
    root.render(<APIPage {...props} showTitle={false} />);
  });
}

const tabCodes = (scope: ParentNode) => [...scope.querySelectorAll('[role=tab]')].map((tab) => tab.textContent?.trim());

describe('the response codes of an API page', () => {
  it('draws the success codes as tabs and every error code in one select, in the example responses and in the response body', async () => {
    await renderPage(WIDEST);

    const selects = [...container.querySelectorAll<HTMLSelectElement>('select[aria-label="Errors"]')];
    expect(selects).toHaveLength(2);
    for (const select of selects) {
      const codes = [...select.options].filter((option) => option.value).map((option) => option.value);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every(isErrorCode)).toBe(true);
    }

    const tabs = tabCodes(container).filter((code): code is string => Boolean(code));
    expect(tabs.length).toBeGreaterThan(0);
    expect(tabs.filter(isErrorCode)).toEqual([]);
    expect(splitResponseCodes(tabs).errors).toEqual([]);
  });

  it('gives each select the error codes of its operation and links the Errors page', async () => {
    await renderPage(WIDEST);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Errors"]');
    const codes = [...(select?.options ?? [])].filter((option) => option.value).map((option) => option.value);
    expect(codes).toEqual(['400', '401', '403', '404', '408', '409', '412', '413', '422', '429', '500', '503', '507']);
    expect(container.querySelector('a[href="/reference/errors"]')).not.toBeNull();
  });

  it('shows the panel of an error code when it is chosen', async () => {
    await renderPage(WIDEST);
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Errors"]');
    expect(select).not.toBeNull();
    const chosen = select as HTMLSelectElement;
    await act(async () => {
      chosen.value = '404';
      chosen.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(chosen.value).toBe('404');
    expect(container.querySelector('[role=tabpanel][data-state=active][id$="content-404"]')).not.toBeNull();
  });
});
