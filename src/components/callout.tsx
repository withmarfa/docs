import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

// Fumadocs' Callout with the same props, drawn as the console draws a notice:
// a filled panel with no border or shadow, the type carried by the icon's
// color alone.

type CalloutType = 'info' | 'warn' | 'warning' | 'error' | 'success' | 'tip';

const ICONS = {
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
  success: CircleCheck,
};

const COLORS = {
  info: 'text-fd-info',
  warning: 'text-fd-warning',
  error: 'text-fd-error',
  success: 'text-fd-success',
};

function resolve(type: CalloutType) {
  if (type === 'warn') return 'warning';
  if (type === 'tip') return 'info';
  return type;
}

export function Callout({
  type = 'info',
  title,
  icon,
  children,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  type?: CalloutType;
  title?: ReactNode;
  icon?: ReactNode;
}) {
  const kind = resolve(type);
  const Icon = ICONS[kind];

  return (
    <div
      {...props}
      className={cn(
        'my-6 flex gap-3 rounded-xl bg-fd-muted px-4 py-3.5 text-sm leading-relaxed',
        className,
      )}
    >
      <span className={cn('mt-0.5 shrink-0 [&_svg]:size-4', COLORS[kind])} aria-hidden>
        {icon ?? <Icon strokeWidth={2} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="my-0! font-medium text-fd-foreground">{title}</p> : null}
        <div className="prose-no-margin text-fd-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}
