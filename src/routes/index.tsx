import { createFileRoute, redirect } from '@tanstack/react-router';

// Land straight on the Introduction — no interstitial splash page.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/$', params: { _splat: 'introduction' } });
  },
});
