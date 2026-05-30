import { createFileRoute } from '@tanstack/react-router';
import { handleMcpRequest } from '@/lib/mcp/server';

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      GET: async ({ request }) => handleMcpRequest(request),
      POST: async ({ request }) => handleMcpRequest(request),
      OPTIONS: async ({ request }) => handleMcpRequest(request),
    },
  },
});
