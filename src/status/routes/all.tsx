import { createFileRoute } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '../layout';
import { loadAllStatus } from '../lib/load';
import { EmptyStore, StatusHeader } from '../components/status-header';
import { IncidentTable, MonitorRow } from '../components/status-rows';

/**
 * Every monitor, including the ones the public page deliberately omits.
 *
 * Staging is checked and alerted on but has nowhere to be looked at, because
 * the front page answers one question — can a user be served — and nobody is
 * served by staging. Putting it behind an unlinked path is the only
 * arrangement where the front page's behavior is unchanged by construction,
 * rather than by a conditional that one edit could invert.
 *
 * It publishes nothing new. `/api/data` already carries every monitor,
 * unauthenticated and readable cross-origin; the documentation site's navbar
 * indicator reads it on every page load. This is a rendering of data that is
 * already public.
 */
export const Route = createFileRoute('/all')({
  loader: async () => await loadAllStatus(),
  headers: () => ({ 'cache-control': 'public, max-age=30' }),
  head: () => ({
    meta: [
      { title: 'Marfa Status, every environment' },
      // Unlinked is not unindexed. Without this the first crawler to find it
      // puts pre-production availability into a search result.
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: AllStatusPage,
});

function AllStatusPage() {
  const { view, now } = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
        {view.empty ? (
          <EmptyStore title="Marfa Status" />
        ) : (
          <>
            <StatusHeader
              title="Marfa Status"
              view={view}
              now={now}
              subtitle="Every environment, including pre-production. The public page at / covers production only."
            />

            {/*
              Grouped by the checker's own map rather than by a list here. A
              second copy would disagree the first time a monitor moved between
              environments, and this page is the one that would be wrong.
            */}
            {view.groups.length > 0 ? (
              view.groups.map((group) => (
                <section key={group.label} className="mt-8">
                  <h2 className="text-sm font-medium text-fd-muted-foreground">
                    {group.label}
                  </h2>
                  <ul className="mt-3 space-y-3">
                    {group.monitors.map((monitor) => (
                      <MonitorRow key={monitor.id} monitor={monitor} now={now} />
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <ul className="mt-8 space-y-3">
                {view.monitors.map((monitor) => (
                  <MonitorRow key={monitor.id} monitor={monitor} now={now} />
                ))}
              </ul>
            )}
          </>
        )}

        <section className="mt-12">
          <h2 className="text-base font-medium text-fd-foreground">Incident history</h2>
          <p className="mt-1 text-xs text-fd-muted-foreground">
            Recorded automatically from a check that runs every minute. There is no
            manual reporting here. Staging fails routinely and says nothing about
            production.
          </p>
          <IncidentTable incidents={view.incidents} />
        </section>
      </main>
    </HomeLayout>
  );
}
