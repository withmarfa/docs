import type { ReactNode } from 'react';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';

// Non-RSC (TanStack Start) client renderer for an OpenAPI operation. Fed the
// serializable payload from `page.data.getOpenAPIPageProps()` in the loader.
//
// We override the operation layout via the supported `content.renderOperationLayout`
// option. fumadocs-openapi's default makes the detail column `flex-1`, so it grows
// unbounded as the layout widens and the body text gets too wide on large screens.
// Capping it at a readable width here — independent of the overall page width —
// pins the code rail to the right and keeps the prose at a comfortable measure.
//
// Slot order: the operation description renders directly under the page heading,
// above the request playground — so an endpoint page opens with a sentence of
// context like every other page, not straight into the POST block. Otherwise the
// order mirrors fumadocs-openapi's default; keep it in sync when bumping the
// package (a new slot won't appear automatically).
// The [1fr | 680px | 1fr] grid shared by operation and webhook pages, so both
// centre their body like a narrative page and keep the code rail on the right.
function CentredLayout({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className="@container flex flex-col gap-y-4 @5xl:grid @5xl:grid-cols-[minmax(0,1fr)_minmax(0,680px)_minmax(0,1fr)] @5xl:items-start @5xl:gap-x-12">
      <div className="mx-auto w-full max-w-[680px] @5xl:col-start-2 @5xl:mx-0 @5xl:max-w-none">
        {main}
      </div>
      <div className="mx-auto w-full max-w-[680px] @5xl:col-start-3 @5xl:mx-0 @5xl:w-[400px] @5xl:max-w-none @5xl:sticky @5xl:top-[calc(var(--fd-docs-row-1,2rem)+1rem)]">
        {rail}
      </div>
    </div>
  );
}

export const APIPage = createOpenAPIPage({
  // The restore action takes a raw gzip archive as its body, a media type the
  // renderer does not know. Without an adapter the whole page throws.
  mediaAdapters: {
    'application/gzip': {
      encode: ({ body }) => body as BodyInit,
      generateExample: () => undefined,
    },
  },
  content: {
    renderOperationLayout: (slots) => (
      <CentredLayout
        main={
          <>
            {slots.header}
            {slots.description}
            {slots.apiPlayground}
            {slots.authSchemes}
            {slots.parameters}
            {slots.body}
            {slots.responses}
            {slots.callbacks}
          </>
        }
        rail={slots.apiExample}
      />
    ),
    renderWebhookLayout: (slots) => (
      <CentredLayout
        main={
          <>
            {slots.header}
            {slots.description}
            {slots.authSchemes}
            {slots.parameters}
            {slots.body}
            {slots.responses}
            {slots.callbacks}
          </>
        }
        rail={slots.requests}
      />
    ),
  },
});
