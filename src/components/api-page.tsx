import { createClientAPIPage } from 'fumadocs-openapi/ui/create-client';

// Non-RSC (TanStack Start) client renderer for an OpenAPI operation. Fed the
// serializable payload from `page.data.getClientAPIPageProps()` in the loader.
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
export const APIPage = createClientAPIPage({
  content: {
    renderOperationLayout: (slots) => (
      // A three-column grid — [1fr | 680px | 1fr] — centres the 680px detail
      // column on screen (the body lines up with the narrative pages, since the
      // page grid is symmetric) while the code rail sits in the right column and
      // extends past it into the reserved TOC space. Below @5xl the columns stack
      // so the rail never runs off a narrow screen.
      <div className="@container flex flex-col gap-y-4 @5xl:grid @5xl:grid-cols-[minmax(0,1fr)_minmax(0,680px)_minmax(0,1fr)] @5xl:items-start @5xl:gap-x-12">
        <div className="mx-auto w-full max-w-[680px] @5xl:col-start-2 @5xl:mx-0 @5xl:max-w-none">
          {slots.header}
          {slots.description}
          {slots.apiPlayground}
          {slots.authSchemes}
          {slots.parameters}
          {slots.body}
          {slots.responses}
          {slots.callbacks}
        </div>
        <div className="mx-auto w-full max-w-[680px] @5xl:col-start-3 @5xl:mx-0 @5xl:w-[400px] @5xl:max-w-none @5xl:sticky @5xl:top-[calc(var(--fd-docs-row-1,2rem)+1rem)]">
          {slots.apiExample}
        </div>
      </div>
    ),
  },
});
