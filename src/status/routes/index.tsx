import { createFileRoute } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '../layout';
import { loadStatus } from '../lib/load';
import { EmptyStore, StatusHeader } from '../components/status-header';
import { IncidentTable, MonitorRow } from '../components/status-rows';

export const Route = createFileRoute('/')({
  loader: async () => await loadStatus(),
  /*
    The same thirty seconds the JSON endpoint already carries, and for the same
    reason: the store behind both is rewritten every few minutes, so a shorter
    window buys nothing and a longer one would hold a resolved outage on screen.
    Without this the page was the one response here served with no cache header
    at all, which leaves the answer to whatever the edge decides.
  */
  headers: () => ({ 'cache-control': 'public, max-age=30' }),
  component: StatusPage,
});

function StatusPage() {
  const { view, now } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
        {view.empty ? (
          <EmptyStore />
        ) : (
          <>
            <StatusHeader view={view} now={now} />

            <ul className="mt-8 space-y-3">
              {view.monitors.map((monitor) => (
                <MonitorRow key={monitor.id} monitor={monitor} now={now} />
              ))}
            </ul>
          </>
        )}

        <section className="mt-12">
          <h2 className="text-base font-medium text-fd-foreground">Incident history</h2>
          {/*
            Said once, here, because nothing else on the page implies it. Every
            row below was written by a check that ran on its own; there is no
            surface for anyone to add, edit or annotate one, and a reader who
            assumes otherwise reads silence as a decision not to comment.
          */}
          <p className="mt-1 text-xs text-fd-muted-foreground">
            Recorded automatically from a check that runs every minute. There is no
            manual reporting here.
          </p>
          <IncidentTable incidents={view.incidents} />
        </section>

        <footer className="mt-12 flex gap-4 border-t border-fd-border pt-6 text-xs text-fd-muted-foreground">
          <a href="/api/data" className="underline underline-offset-4 hover:text-fd-foreground">
            JSON
          </a>
          <a href="/feed.xml" className="underline underline-offset-4 hover:text-fd-foreground">
            Atom
          </a>
        </footer>
      </main>
    </HomeLayout>
  );
}
