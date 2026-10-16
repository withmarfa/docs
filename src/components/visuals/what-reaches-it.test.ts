import { describe, expect, it } from 'vitest';
import { api, keeps, native, online } from './what-reaches-it';

describe('what reaches it figure', () => {
  // After the architecture drawing in withmarfa/marfa's README: native clients
  // embed the Rust core, online clients use the TypeScript SDK, and both reach
  // the HTTP API in front of the instance's SQLite database and files.
  it('puts the Swift SDK and the CLI over the Rust core, and the TypeScript SDK beside them', () => {
    expect(native.clients.map((layer) => layer.title)).toEqual(['Swift SDK', 'CLI']);
    expect(native.core.title).toBe('Rust core');
    expect(online.title).toBe('TypeScript SDK');
  });

  it('ends at the HTTP API and the instance’s two stores', () => {
    expect(api.title).toBe('HTTP API');
    expect(keeps).toEqual(['One SQLite database', 'A folder of files']);
  });
});
