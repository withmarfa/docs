import Link from 'fumadocs-core/link';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Search } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

// The top bar both sites share: the mark and the site's name on the left, an
// optional switcher in the middle, and one row of equal icon buttons on the
// right. Relative imports, because the status build has no `@/`.

// One shape for every control in the bar: a 32px square with a 10px corner,
// gray until hovered. Glyphs inside are 16px.
export const iconButton =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-fd-muted-foreground transition-colors duration-150 hover:bg-fd-accent hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-ring [&_svg]:size-4';

// The docs favicon, drawn in the page's colors: the tile in the text color and
// the arrow cut out of it in the canvas color.
export function MarfaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="11 4 360 360" className={cn('size-5', className)} aria-hidden>
      <clipPath id="marfa-mark-tile">
        <rect x="11" y="4" width="360" height="360" rx="120" />
      </clipPath>
      <g clipPath="url(#marfa-mark-tile)">
        <rect x="11" y="4" width="360" height="360" className="fill-fd-foreground" />
        <path
          className="fill-fd-background"
          d="M489.455 -105C516.618 -105 537.669 -97.5247 552.609 -82.574C566.87 -67.6233 574 -46.5565 574 -19.3735L574 546.373C574 574.236 566.191 595.303 550.572 609.574C534.953 624.525 512.883 632 484.362 632C460.594 632 441.919 627.243 428.338 617.729C414.077 608.894 401.175 593.944 389.63 572.877L170.628 179.402H206.279L-11.7048 572.877C-23.9282 593.944 -36.8307 608.894 -50.4123 617.729C-64.6729 627.243 -83.6871 632 -107.455 632C-134.618 632 -155.33 624.525 -169.59 609.574C-184.53 595.303 -192 574.236 -192 546.373L-192 -19.3735C-192 -46.5565 -184.87 -67.6233 -170.609 -82.574C-156.348 -97.5247 -135.297 -105 -107.455 -105C-80.2917 -105 -59.2403 -97.5247 -44.3006 -82.574C-30.0399 -67.6233 -22.9096 -46.5565 -22.9096 -19.3735L-22.9096 331.288H-44.3006L119.697 45.8658C129.204 30.9151 139.39 19.7022 150.255 12.2268C160.441 4.75149 174.363 1.01385 192.019 1.01385C208.996 1.01385 222.917 4.75149 233.782 12.2268C244.647 19.7022 254.494 30.9151 263.322 45.8658L428.338 332.307H404.91L404.91 -19.3735C404.91 -46.5565 412.04 -67.6233 426.301 -82.574C440.561 -97.5247 461.613 -105 489.455 -105Z"
        />
      </g>
    </svg>
  );
}

// The two wordmarks are solid shapes, which read heavier than Lucide's
// outlines at the same size, so they are drawn a pixel smaller.
export function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-[15px]!" aria-hidden>
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

export function NpmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-[14px]!" aria-hidden>
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
        className="inline-flex items-center gap-2.5 rounded-md text-[0.9375rem] font-semibold tracking-[-0.005em] text-fd-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fd-ring"
      >
        <MarfaMark />
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
