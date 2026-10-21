'use client';
import Link from 'fumadocs-core/link';
import { usePathname } from 'fumadocs-core/framework';
import { useFooterItems } from 'fumadocs-ui/utils/use-footer-items';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/cn';

const normalize = (url: string) => url.replace(/\/+$/, '') || '/';

// The previous and next pages, as two quiet tiles in the Cards style: a small
// label and the page's name. Fumadocs' footer adds each page's description,
// cut off at one line, which read as a sentence that stopped halfway.
export function PageFooter({ className }: { className?: string }) {
  const items = useFooterItems();
  const pathname = usePathname();

  const { previous, next } = useMemo(() => {
    const index = items.findIndex((item) => normalize(item.url) === normalize(pathname));
    if (index === -1) return {};
    return { previous: items[index - 1], next: items[index + 1] };
  }, [items, pathname]);

  if (!previous && !next) return null;

  return (
    <nav aria-label="More pages" className={cn('@container grid grid-cols-2 gap-3', className)}>
      {previous ? (
        <FooterLink href={previous.url} label="Previous" name={previous.name} />
      ) : (
        <span aria-hidden />
      )}
      {next ? <FooterLink href={next.url} label="Next" name={next.name} end /> : null}
    </nav>
  );
}

function FooterLink({
  href,
  label,
  name,
  end = false,
}: {
  href: string;
  label: string;
  name: React.ReactNode;
  end?: boolean;
}) {
  const Arrow = end ? ArrowRight : ArrowLeft;
  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col gap-0.5 rounded-xl border px-4 py-3 transition-colors duration-150 hover:bg-fd-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring @max-md:col-span-full',
        end && 'items-end text-end @md:col-start-2',
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs text-fd-muted-foreground',
          end && 'flex-row-reverse',
        )}
      >
        <Arrow className="size-3.5" strokeWidth={1.75} aria-hidden />
        {label}
      </span>
      <span className="text-[0.9375rem] font-medium text-fd-foreground">{name}</span>
    </Link>
  );
}
