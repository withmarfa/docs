import {
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/notebook/page';

// A single split-button. The main part, "Copy Markdown", copies the page's
// Markdown; the attached chevron opens the same "open in…" / view-as-markdown
// options the standalone "Open" button used to carry. Passing an empty string
// as the popover's children strips its default "Open" label, leaving just the
// chevron.
export function PageActions({
  markdownUrl,
  githubUrl,
}: {
  markdownUrl: string;
  githubUrl?: string;
}) {
  return (
    // One outline control, the console's: a hairline border, the control
    // radius and a 32px height. No `overflow-hidden` on the wrapper, which
    // would clip the halves' focus rings, so each half rounds its own outer
    // corners, a pixel inside the border.
    <div className="inline-flex h-8 items-center rounded-md border bg-fd-card text-fd-foreground">
      <MarkdownCopyButton
        markdownUrl={markdownUrl}
        className="h-full gap-1.5 rounded-none rounded-l-[9px] border-0 bg-transparent px-3 text-[0.8125rem] font-medium hover:bg-fd-accent"
      />
      <div className="h-4 w-px shrink-0 bg-fd-border" aria-hidden />
      <ViewOptionsPopover
        markdownUrl={markdownUrl}
        githubUrl={githubUrl}
        aria-label="More options"
        className="h-full rounded-none rounded-r-[9px] border-0 bg-transparent px-2 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-foreground"
      >
        {''}
      </ViewOptionsPopover>
    </div>
  );
}
