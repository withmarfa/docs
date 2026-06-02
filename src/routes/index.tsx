import { createFileRoute, redirect } from '@tanstack/react-router';

// Land straight on the docs — no interstitial splash page.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/docs/$', params: { _splat: '' } });
  },
});
