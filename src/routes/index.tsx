import { createFileRoute, redirect } from '@tanstack/react-router';

// Land on what Marfa is, which is the first page of Get started, with no splash page.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$', params: { _splat: 'get-started' } });
  },
});
