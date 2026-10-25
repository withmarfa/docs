import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

// A callout is a soft tinted panel: a bold title in the tint's dark color, the
// body under it, no border, shadow or icon. The tint says what kind of note it
// is and the title says what happens. The colors are the `--marfa-callout-*`
// tokens in app.css, which other components reuse.

type CalloutType = 'info' | 'warn' | 'warning' | 'error' | 'success' | 'tip' | 'idea';

// Written out whole, so Tailwind finds each class.
const TINTS = {
  info: {
    panel: 'bg-(--marfa-callout-info-bg)',
    title: 'text-(--marfa-callout-info-title)',
    body: 'text-(--marfa-callout-info-body)',
  },
  warning: {
    panel: 'bg-(--marfa-callout-warning-bg)',
    title: 'text-(--marfa-callout-warning-title)',
    body: 'text-(--marfa-callout-warning-body)',
  },
  error: {
    panel: 'bg-(--marfa-callout-error-bg)',
    title: 'text-(--marfa-callout-error-title)',
    body: 'text-(--marfa-callout-error-body)',
  },
  success: {
    panel: 'bg-(--marfa-callout-success-bg)',
    title: 'text-(--marfa-callout-success-title)',
    body: 'text-(--marfa-callout-success-body)',
  },
};

function resolve(type: CalloutType) {
  if (type === 'warn') return 'warning';
  if (type === 'tip' || type === 'idea') return 'info';
  return type;
}

export function Callout({
  type = 'info',
  title,
  children,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  type?: CalloutType;
  title: ReactNode;
}) {
  const tint = TINTS[resolve(type)];
  return (
    <div
      {...props}
      className={cn('my-6 flex flex-col gap-0.5 rounded-xl px-4 py-3 text-sm leading-relaxed', tint.panel, className)}
    >
      <p className={cn('my-0! font-semibold', tint.title)}>{title}</p>
      <div
        className={cn(
          '[&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_a]:text-inherit [&_strong]:font-semibold [&_strong]:text-inherit',
          tint.body,
        )}
      >{children}</div>
    </div>
  );
}
