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
    // No `overflow-hidden` on the wrapper: it would clip the inner buttons'
    // focus ring. Instead the two halves round their own outer corners (5px to
    // nest inside the 1px border) so they still read as one pill.
    <div className="inline-flex items-center rounded-md border bg-fd-secondary/30 backdrop-blur-sm text-fd-muted-foreground">
      <MarkdownCopyButton
        markdownUrl={markdownUrl}
        className="rounded-none rounded-l-[5px] border-0 bg-transparent hover:bg-fd-accent"
      />
      <div className="h-5 w-px shrink-0 bg-fd-border" aria-hidden />
      <ViewOptionsPopover
        markdownUrl={markdownUrl}
        githubUrl={githubUrl}
        aria-label="More options"
        className="rounded-none rounded-r-[5px] border-0 bg-transparent px-2 hover:bg-fd-accent"
      >
        {''}
      </ViewOptionsPopover>
    </div>
  );
}
