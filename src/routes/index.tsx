import { createFileRoute, redirect } from '@tanstack/react-router';

// Land on what Marfa is, with no splash page.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$', params: { _splat: 'learn' } });
  },
});
