import Link from 'fumadocs-core/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

// Fumadocs' Cards and Card with the same props, drawn as quiet tiles: a
// hairline border, a fill on hover instead of a shadow, and the title a step
// above the description. Its own versions fix the title at 14px and give the
// grid no margin, so the paragraph after it sat close against the cards.

export function Cards({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn('not-prose @container my-6 grid grid-cols-2 gap-3', className)}
    />
  );
}

type CardProps = Omit<ComponentProps<'a'>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  href?: string;
};

export function Card({ title, description, icon, href, children, className, ...props }: CardProps) {
  const body = (
    <>
      {icon ? (
        <div className="mb-1 w-fit text-fd-muted-foreground [&_svg]:size-4">{icon}</div>
      ) : null}
      <h3 className="text-[0.9375rem] font-medium leading-snug text-fd-foreground">{title}</h3>
      {description || children ? (
        <div className="text-sm leading-relaxed text-fd-muted-foreground">
          {description}
          {children}
        </div>
      ) : null}
    </>
  );

  const shared = cn(
    'flex flex-col gap-1 rounded-xl border bg-fd-card px-4 py-3.5 @max-lg:col-span-full',
    className,
  );

  if (!href) return <div className={shared}>{body}</div>;

  return (
    <Link
      href={href}
      data-card
      {...props}
      className={cn(
        shared,
        'transition-colors duration-150 hover:bg-fd-accent/50',
      )}
    >
      {body}
    </Link>
  );
}
