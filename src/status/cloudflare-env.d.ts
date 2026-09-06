/**
 * The one Workers binding this page uses, declared by hand.
 *
 * `wrangler types` generates this, along with fourteen thousand lines of
 * runtime declarations. That file is gitignored, so committing it here would
 * mean carrying a generated dependency snapshot in a repository a dozen
 * worktrees merge through, conflicting on every Wrangler bump, to type one
 * method call.
 *
 * Declared structurally instead, so the surface actually used is visible and
 * anything else fails to compile. If full runtime types are ever generated and
 * committed for this target, delete this file — two declarations of the same
 * module do not merge.
 */
declare module 'cloudflare:workers' {
  export const env: {
    UPTIMEFLARE_D1: {
      prepare(query: string): {
        bind(...values: unknown[]): {
          first<T>(): Promise<T | null>;
        };
      };
    };
  };
}
