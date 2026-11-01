import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MapArea } from '@/lib/api-map';
import { ApiMapView } from './api-map';

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
