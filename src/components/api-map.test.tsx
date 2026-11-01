// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MapArea } from '@/lib/api-map';
import { ApiMapView } from './api-map';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const map: MapArea[] = [
  {
    name: 'Data',
    count: 2,
    groups: [
      {
        name: 'Folders',
        description: 'A folder\'s settings, held as a `system.folder` item.',
        href: '/api-reference/folders/listFolders',
        operations: [
          { method: 'GET', path: '/folders', title: 'List folders', href: '/api-reference/folders/listFolders', webhook: false },
          {
            method: 'PATCH',
            path: '/folders/{id}',
            title: 'Update a folder',
            href: '/api-reference/folders/updateFolder',
            webhook: false,
          },
        ],
      },
    ],
  },
  {
    name: 'Changes',
    count: 1,
    groups: [
      {
        name: 'Webhooks',
        description: '',
        href: '/api-reference/webhooks/receiveWebhookEvent',
        operations: [
          {
            method: 'WEBHOOK',
            path: 'event',
            title: 'Receive a webhook event',
            href: '/api-reference/webhooks/receiveWebhookEvent',
            webhook: true,
          },
        ],
      },
    ],
  },
];

describe('the API map on the server', () => {
  const html = renderToStaticMarkup(<ApiMapView map={map} />);

  it('renders every operation as a link to its page, with its method', () => {
    expect(html.match(/<a [^>]*class="marfa-apimap-row"/g)).toHaveLength(3);
    expect(html).toContain('href="/api-reference/folders/updateFolder"');
    expect(html).toContain('marfa-api-method--patch');
    expect(html).toContain('marfa-api-method--webhook');
  });

  it('marks path parameters and lets a path break after each slash', () => {
    expect(html).toContain('/<wbr/><span class="marfa-apimap-param">{id}</span>');
  });

  it('names a webhook by its title, since it has no path', () => {
    expect(html).toContain('<span class="marfa-apimap-webhook">Receive a webhook event</span>');
  });

  it("draws a description's code spans as code", () => {
    expect(html).toContain('held as a <code>system.folder</code> item');
  });

  it('shows each area and group with its count of operations', () => {
    expect(html).toContain('aria-label="The HTTP API: 3 operations in 2 areas"');
    expect(html).toMatch(/marfa-apimap-group-name">Folders<\/span><span class="marfa-apimap-count">2</);
  });
});

describe('the button that opens every group', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<ApiMapView map={map} />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  const groups = () => [...host.querySelectorAll('details')];
  const button = () => host.querySelector<HTMLButtonElement>('.marfa-apimap-toggle')!;
  const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  const labels = () => [...button().querySelectorAll('span[data-current]')].map((span) => span.textContent);

  it('is in the server render but hidden until the page has hydrated', () => {
    const html = renderToStaticMarkup(<ApiMapView map={map} />);
    expect(html).toContain('class="marfa-apimap-toolbar"');
    expect(html).not.toContain('data-ready');
    expect(host.querySelector('.marfa-apimap-toolbar')!.hasAttribute('data-ready')).toBe(true);
  });

  it('opens every group, then closes them all, and leaves them closed to start', async () => {
    expect(groups().every((group) => !group.open)).toBe(true);
    expect(labels()).toEqual(['Show all operations']);
    await act(async () => button().click());
    await settle();
    expect(groups().every((group) => group.open)).toBe(true);
    expect(labels()).toEqual(['Hide operations']);
    await act(async () => button().click());
    await settle();
    expect(groups().every((group) => !group.open)).toBe(true);
    expect(labels()).toEqual(['Show all operations']);
  });

  it('follows groups opened one at a time', async () => {
    await act(async () => {
      groups()[0].open = true;
    });
    await settle();
    expect(labels()).toEqual(['Show all operations']);
    await act(async () => {
      groups()[1].open = true;
    });
    await settle();
    expect(labels()).toEqual(['Hide operations']);
  });
});
