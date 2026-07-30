import { createFileRoute } from '@tanstack/react-router';
import { handleMcpRequest } from '@/lib/mcp/server';

// GET and DELETE are declared so they reach the handler and get the `405` the
// specification asks for. Without them the router answers `404` first, which a
// client can read as "this endpoint does not exist" rather than "this endpoint
// does not offer server-initiated streams or sessions".
export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      GET: async ({ request }) => handleMcpRequest(request),
      POST: async ({ request }) => handleMcpRequest(request),
      DELETE: async ({ request }) => handleMcpRequest(request),
      OPTIONS: async ({ request }) => handleMcpRequest(request),
    },
  },
});
