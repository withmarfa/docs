'use client';
import { useTheme } from 'fumadocs-ui/provider/base';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '../lib/cn';
import { iconButton } from './site-header';

// One button in the top bar's icon row rather than a three-way pill: it shows
// the current choice and moves to the next on a click. Appearance is set once,
// so it shouldn't be the widest control in the bar. Relative imports: the
// status build has no `@/`.
const THEMES = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
] as const;

const subscribe = () => () => {};

export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // The saved choice is only known in the browser, so the server render shows
  // System, the default.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const index = mounted ? Math.max(0, THEMES.findIndex((t) => t.value === theme)) : 0;
  const { label, Icon } = THEMES[index];
  const next = THEMES[(index + 1) % THEMES.length];

  const choose = (value: string) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(() => setTheme(value)));
    } else {
      setTheme(value);
    }
  };

  return (
    <button
      type="button"
      aria-label={`Appearance: ${label}. Switch to ${next.label}`}
      title={`Appearance: ${label}`}
      data-theme-toggle=""
      className={cn(iconButton, className)}
      onClick={() => choose(next.value)}
    >
      <Icon strokeWidth={1.75} />
    </button>
  );
}
