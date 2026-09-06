import { createServerFn } from '@tanstack/react-start';
import { readStore } from './store';
import { PUBLIC_MONITORS, buildView, parseMeta, parseState } from './state';
import type { StatusView } from './state';

export type StatusPayload = {
  view: StatusView;
  /** The server's clock at render, so relative times agree after hydration. */
  now: number;
};

/**
 * The page's data, read on the server only.
 *
 * A route loader runs on both sides, and this one reaches a binding. Keeping
 * it in a server function is what stops the store module — and the runtime
 * import inside it — reaching the browser bundle.
 */
export const loadStatus = createServerFn().handler(async (): Promise<StatusPayload> => {
  const raw = await readStore();
  const now = Math.floor(Date.now() / 1000);
  return {
    view: buildView(parseState(raw.state), parseMeta(raw.meta), PUBLIC_MONITORS, now),
    now,
  };
});
