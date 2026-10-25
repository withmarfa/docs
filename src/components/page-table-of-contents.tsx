'use client';

import { TOCItem } from 'fumadocs-core/toc';
import {
  TOCScrollArea,
  useItems,
  useTOCItems,
} from 'fumadocs-ui/components/toc';
import { ChevronDown, Text } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

function headingIndent(depth: number): string | undefined {
  if (depth <= 2) return undefined;
  return `${(depth - 2) * 0.75}rem`;
}

function PageTableOfContentsList({ onSelect }: { onSelect?: () => void }) {
  const items = useTOCItems();

  return (
    <nav aria-label="On this page" className="flex flex-col">
      {items.map((item) => (
        <TOCItem
          key={item.url}
          href={item.url}
          className="py-1.5 text-sm text-fd-muted-foreground transition-colors wrap-anywhere hover:text-fd-accent-foreground data-[active=true]:font-medium data-[active=true]:text-fd-primary"
          style={{ paddingInlineStart: headingIndent(item.depth) }}
          onClick={onSelect}
        >
          {item.title}
        </TOCItem>
      ))}
    </nav>
  );
}

export function PageTableOfContents() {
  const items = useTOCItems();

  if (items.length === 0) {
    return (
      <div
        id="nd-toc-placeholder"
        className="hidden xl:layout:[--fd-toc-width:268px]"
      />
    );
  }

  return (
    <div
      id="nd-toc"
      className="sticky top-(--fd-docs-row-3) [grid-area:toc] flex h-[calc(var(--fd-docs-height)-var(--fd-docs-row-3))] w-(--fd-toc-width) flex-col pt-12 pe-4 pb-2 max-xl:hidden xl:layout:[--fd-toc-width:268px]"
    >
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
      >
        <Text className="size-4" />
        On this page
      </h3>
      <TOCScrollArea>
        <PageTableOfContentsList />
      </TOCScrollArea>
    </div>
  );
}

export function PageTableOfContentsPopover() {
  const items = useTOCItems();
  const activeItems = useItems();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentId = useId();
  const activeTitle = [...activeItems]
    .reverse()
    .find((item) => item.active)?.original.title;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      data-toc-popover=""
      className="sticky top-(--fd-docs-row-2) z-10 [grid-area:toc-popover] h-(--fd-toc-popover-height) md:hidden max-md:layout:[--fd-toc-popover-height:--spacing(10)]"
    >
      <div className="relative border-b bg-fd-background/95 backdrop-blur-sm">
        <button
          ref={triggerRef}
          type="button"
          aria-controls={contentId}
          aria-expanded={open}
          className="flex h-10 w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm text-fd-muted-foreground"
          onClick={() => setOpen((value) => !value)}
        >
          <Text className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {activeTitle ?? 'On this page'}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <div
          id={contentId}
          hidden={!open}
          className="absolute inset-x-0 top-full border-b bg-fd-background/95 backdrop-blur-sm"
        >
          <TOCScrollArea className="max-h-[50vh] px-4 py-2">
            <PageTableOfContentsList onSelect={() => setOpen(false)} />
          </TOCScrollArea>
        </div>
      </div>
    </div>
  );
}
