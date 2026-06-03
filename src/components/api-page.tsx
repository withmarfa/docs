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
// The slot order below mirrors fumadocs-openapi's default exactly; keep it in sync
// when bumping the package (a new slot won't appear automatically).
export const APIPage = createClientAPIPage({
  content: {
    renderOperationLayout: (slots) => (
      <div className="flex flex-col gap-x-6 gap-y-4 @4xl:flex-row @4xl:items-start @4xl:justify-between">
        <div className="min-w-0 flex-1 @4xl:max-w-[680px]">
          {slots.header}
          {slots.apiPlayground}
          {slots.description}
          {slots.authSchemes}
          {slots.parameters}
          {slots.body}
          {slots.responses}
          {slots.callbacks}
        </div>
        <div className="@4xl:sticky @4xl:top-[calc(var(--fd-docs-row-1,2rem)+1rem)] @4xl:w-[400px]">
          {slots.apiExample}
        </div>
      </div>
    ),
  },
});
