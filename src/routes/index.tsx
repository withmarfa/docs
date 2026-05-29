import { createFileRoute, Link } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-col flex-1 justify-center px-4 py-16 text-center max-w-2xl mx-auto">
        <h1 className="font-semibold text-3xl mb-4">Marfa docs</h1>
        <p className="text-fd-muted-foreground mb-8">
          Marfa is a typed data layer for structured personal data. Build apps on a shared type
          system, multi-tenant by design.
        </p>
        <Link
          to="/docs/$"
          params={{ _splat: '' }}
          className="px-4 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm mx-auto"
        >
          Read the docs
        </Link>
      </div>
    </HomeLayout>
  );
}
