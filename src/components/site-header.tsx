import Link from 'fumadocs-core/link';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Search } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

// The top bar both sites share: the site's name on the left, an
// optional switcher in the middle, and one row of equal icon buttons on the
// right. Relative imports, because the status build has no `@/`.

// One shape for every control in the bar: a 32px square with a 10px corner,
// gray until hovered. Glyphs inside are 17px.
export const iconButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fd-muted-foreground transition-colors duration-150 hover:bg-fd-accent hover:text-fd-foreground [&_svg]:size-[17px]';

// The two wordmarks are solid shapes, which read heavier than Lucide's
// outlines at the same size, so npm is drawn two pixels smaller.
export function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-[17px]!" aria-hidden>
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

export function NpmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[15px]!" aria-hidden>
      <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
    </svg>
  );
}

export function IconLink({
  label,
  className,
  ...props
}: ComponentProps<'a'> & { label: string }) {
  const external = props.href?.startsWith('http');
  return (
    <a
      aria-label={label}
      title={label}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      {...props}
      className={cn(iconButton, className)}
    />
  );
}

export function SearchButton({ className }: { className?: string }) {
  const { enabled, setOpenSearch } = useSearchContext();
  if (!enabled) return null;
  return (
    <button
      type="button"
      aria-label="Search"
      title="Search"
      className={cn(iconButton, className)}
      onClick={() => setOpenSearch(true)}
    >
      <Search strokeWidth={1.75} />
    </button>
  );
}

export function HeaderBar({
  title,
  href,
  center,
  actions,
}: {
  title: string;
  href: string;
  center?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="relative flex h-14 items-center gap-2 border-b px-4 md:px-6">
      <Link
        href={href}
        className="rounded-md text-[0.9375rem] font-semibold tracking-[-0.005em] text-fd-foreground"
      >
        {title}
      </Link>
      {center ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-lg:hidden">
          {center}
        </div>
      ) : null}
      <div className="ms-auto flex items-center gap-1 -me-1.5">{actions}</div>
    </div>
  );
}
