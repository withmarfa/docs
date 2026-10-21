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
  title = 'Something went wrong',
  message,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title?: string;
  /** One sentence under the heading. What the reader can do, not what broke. */
  message: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl grow flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.01em] text-fd-foreground sm:text-[1.625rem]">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-fd-muted-foreground">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {/*
          A real navigation rather than a reload handler. This component renders
          inside a boundary that may itself have failed to hydrate, and an
          anchor works with no JavaScript running at all.
        */}
        <a
          href={primaryHref}
          className="inline-flex h-8 items-center rounded-md bg-fd-primary px-3 text-[0.8125rem] font-medium text-fd-primary-foreground transition-opacity duration-150 hover:opacity-85"
        >
          {primaryLabel}
        </a>
        {secondaryHref && secondaryLabel ? (
          <a
            href={secondaryHref}
            className="inline-flex h-8 items-center rounded-md border bg-fd-card px-3 text-[0.8125rem] font-medium text-fd-foreground transition-colors duration-150 hover:bg-fd-accent"
          >
            {secondaryLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
