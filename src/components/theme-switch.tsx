'use client';
import { useTheme } from 'fumadocs-ui/provider/base';
import { Airplay, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore, type ComponentProps } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '../lib/cn';

// Fumadocs' three-way switch with System first. Its order is fixed inside the
// component, so the docs layouts swap it in through `slots.themeSwitch`, the
// replacement Fumadocs provides, and the status page places it as a nav item.
// Relative imports: the status build has no `@/`.
const THEMES = [
  { value: 'system', label: 'System', Icon: Airplay },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const;

const subscribe = () => () => {};

export function ThemeSwitch({ className, ...props }: ComponentProps<'div'>) {
  const { theme, setTheme } = useTheme();
  // The saved choice is only known in the browser, so the server render marks none.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const current = mounted ? theme : null;

  const choose = (value: string) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(() => setTheme(value)));
    } else {
      setTheme(value);
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border p-1 overflow-hidden *:rounded-full',
        className,
      )}
      data-theme-toggle=""
      {...props}
    >
      {THEMES.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={current === value}
          className={cn(
            'size-6.5 p-1.5',
            current === value
              ? 'bg-fd-accent text-fd-accent-foreground'
              : 'text-fd-muted-foreground',
          )}
          onClick={() => choose(value)}
        >
          <Icon className="size-full" fill="currentColor" />
        </button>
      ))}
    </div>
  );
}
