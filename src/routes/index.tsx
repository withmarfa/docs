import { createFileRoute, redirect } from '@tanstack/react-router';

// Land on the Overview, the first page of the first tab, with no splash page.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$', params: { _splat: 'overview' } });
  },
});
