import { createFileRoute } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '../layout';
import { loadStatus } from '../lib/load';
import { formatAbsolute, formatAge } from '../lib/format';
import { IncidentList, MonitorRow, StatusDot } from '../components/status-rows';

export const Route = createFileRoute('/')({
  loader: async () => await loadStatus(),
  component: StatusPage,
});

function StatusPage() {
  const { view, now } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-fd-foreground sm:text-3xl">
            Marfa status
          </h1>

          {view.empty ? (
            <p className="mt-4 rounded-xl border border-fd-border bg-fd-card p-4 text-sm text-fd-muted-foreground">
              No recent checks are recorded. This page reports what the checker
              last wrote, so an empty store means the checks themselves have
              stopped rather than that anything is known to be healthy.
            </p>
          ) : (
            <>
              <p className="mt-3 flex items-center gap-2 text-lg text-fd-foreground">
                <StatusDot up={view.allUp} />
                {view.allUp
                  ? 'All systems operational'
                  : `${view.downCount} of ${view.monitors.length} systems down`}
              </p>
              {/*
                The last-checked time is the point of the header, not a
                footnote. A stopped checker and a healthy fleet both produce a
                page full of green; this line is the only thing that separates
                them.
              */}
              <p className="mt-1 text-sm text-fd-muted-foreground">
                Last checked {formatAge(view.lastUpdate, now)}
                <span className="hidden sm:inline">
                  {' '}
                  at {formatAbsolute(view.lastUpdate)}
                </span>
              </p>
            </>
          )}
        </header>

        {view.empty ? null : (
          <ul className="mt-8 space-y-3">
            {view.monitors.map((monitor) => (
              <MonitorRow key={monitor.id} monitor={monitor} now={now} />
            ))}
          </ul>
        )}

        <section className="mt-12">
          <h2 className="text-sm font-medium tracking-wide text-fd-muted-foreground uppercase">
            Incident history
          </h2>
          <div className="mt-4">
            <IncidentList incidents={view.incidents} />
          </div>
        </section>

        <footer className="mt-12 border-t border-fd-border pt-6 text-xs text-fd-muted-foreground">
          <p>
            Checked every minute from Cloudflare&rsquo;s network, which sits
            outside the systems it reports on.{' '}
            Machine-readable:{' '}
            <a href="/api/data" className="underline underline-offset-4">
              JSON
            </a>{' '}
            and{' '}
            <a href="/feed.xml" className="underline underline-offset-4">
              Atom feed
            </a>
            .
          </p>
        </footer>
      </main>
    </HomeLayout>
  );
}
