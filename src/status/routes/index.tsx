import { createFileRoute } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '../layout';

export const Route = createFileRoute('/')({
  component: StatusPage,
});

function StatusPage() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground">
          Marfa status
        </h1>
        <p className="mt-3 text-fd-muted-foreground">
          Current availability of the Marfa API, file storage and documentation.
        </p>
      </main>
    </HomeLayout>
  );
}
