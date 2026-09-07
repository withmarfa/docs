/**
 * What a reader sees when a route throws.
 *
 * Without an `errorComponent` configured, TanStack Router renders its own,
 * which prints the thrown message verbatim under a "Something went wrong!"
 * heading. That published the store's table name and engine on a public page,
 * which is neither useful to a reader nor ours to hand out.
 *
 * Shared by both build targets. The status page imports it relatively rather
 * than through the `@/` alias, which resolves into the documentation
 * application and would silently pull the wrong module into that bundle.
 */
export function ErrorPage({
  message,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  /** One sentence under the heading. What the reader can do, not what broke. */
  message: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl grow flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-fd-foreground sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-fd-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {/*
          A real navigation rather than a reload handler. This component renders
          inside a boundary that may itself have failed to hydrate, and an
          anchor works with no JavaScript running at all.
        */}
        <a
          href={primaryHref}
          className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90"
        >
          {primaryLabel}
        </a>
        {secondaryHref && secondaryLabel ? (
          <a
            href={secondaryHref}
            className="rounded-lg border border-fd-border px-4 py-2 text-sm font-medium text-fd-foreground hover:bg-fd-accent"
          >
            {secondaryLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
