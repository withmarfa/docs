import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';

// Fumadocs' Callout, drawn as a faint wash of its type's color with no border,
// shadow or icon: the tint says what kind of note it is, and the title, when
// there is one, says the rest. `icon` is accepted and not drawn.

type CalloutType = 'info' | 'warn' | 'warning' | 'error' | 'success' | 'tip';

const TINTS = {
  info: 'bg-fd-info/6',
  warning: 'bg-fd-warning/8',
  error: 'bg-fd-error/6',
  success: 'bg-fd-success/6',
};

function resolve(type: CalloutType) {
  if (type === 'warn') return 'warning';
  if (type === 'tip') return 'info';
  return type;
}

export function Callout({
  type = 'info',
  title,
  icon: _icon,
  children,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  type?: CalloutType;
  title?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      {...props}
      className={cn(
        'my-6 flex flex-col gap-1 rounded-xl px-4 py-3 text-sm leading-relaxed',
        TINTS[resolve(type)],
        className,
      )}
    >
      {title ? <p className="my-0! font-medium text-fd-foreground">{title}</p> : null}
      <div className={cn('prose-no-margin', title ? 'text-fd-foreground/75' : 'text-fd-foreground/85')}>
        {children}
      </div>
    </div>
  );
}
