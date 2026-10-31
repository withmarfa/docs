import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type ToggleEvent } from 'react';

/**
 * The one row of controls an interactive figure has: a set of buttons, and at
 * most one menu at its right. The row never wraps; on a narrow screen it
 * scrolls sideways. A figure opens with a choice already made and always has
 * one, so it needs no label, no prompt and no reset.
 */
export function Controls({ children }: { children: ReactNode }) {
  return <div className="marfa-ix-controls">{children}</div>;
}

export type Option<T extends string> = { id: T; label: ReactNode };

/**
 * Buttons of which exactly one is pressed. Each says what it does, so the
 * group's name is for assistive technology only. Pressing one changes only
 * which is filled, never a button's size.
 */
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="marfa-ix-group" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="marfa-ix-button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A second choice, as a compact menu. Its button is always as wide as its
 * longest option, so choosing one moves nothing. The list opens in the top
 * layer as a popover, which the scrolling row can't clip; it closes on a
 * click outside, on Escape, on a choice and when the page scrolls.
 */
export function Menu<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => list.current?.hidePopover();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // Placed under the button, at its left edge and at least as wide.
  function place(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== 'open' || !button.current || !list.current) return;
    const rect = button.current.getBoundingClientRect();
    list.current.style.top = `${rect.bottom + 4}px`;
    list.current.style.left = `${rect.left}px`;
    list.current.style.minWidth = `${rect.width}px`;
  }

  function toggled(event: ToggleEvent<HTMLDivElement>) {
    const isOpen = event.newState === 'open';
    setOpen(isOpen);
    if (isOpen) items.current[Math.max(0, options.findIndex((option) => option.id === value))]?.focus();
  }

  function move(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.current.findIndex((item) => item === document.activeElement);
    const last = options.length - 1;
    const next =
      event.key === 'ArrowDown'
        ? Math.min(last, index + 1)
        : event.key === 'ArrowUp'
          ? Math.max(0, index - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) {
      if (event.key === 'Tab') list.current?.hidePopover();
      return;
    }
    event.preventDefault();
    items.current[next]?.focus();
  }

  const current = options.find((option) => option.id === value);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="marfa-ix-button marfa-ix-menu"
        popoverTarget={id}
        aria-haspopup="menu"
        aria-label={`${label}: ${typeof current?.label === 'string' ? current.label : value}`}
      >
        <span className="marfa-ix-menu-value">
          {options.map((option) => (
            <span key={option.id} aria-hidden="true" data-current={option.id === value || undefined}>
              {option.label}
            </span>
          ))}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      <div
        ref={list}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        className="marfa-ix-menu-list"
        onBeforeToggle={place}
        onToggle={toggled}
        onKeyDown={move}
      >
        {options.map((option, index) => (
          <button
            key={option.id}
            ref={(node) => {
              items.current[index] = node;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={option.id === value}
            onClick={() => {
              onChange(option.id);
              list.current?.hidePopover();
              button.current?.focus();
            }}
          >
            {option.label}
            <Check aria-hidden="true" />
          </button>
        ))}
      </div>
    </>
  );
}

/** Text with `code` spans between backticks, drawn as inline code. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, index) => (index % 2 ? <code key={index}>{part}</code> : part))}
    </>
  );
}

/**
 * One of several things in the same place, all laid in one grid cell so the
 * place is as wide and as tall as the largest. Changing the current one
 * changes nothing around it.
 */
export function Swap<T extends string>({
  values,
  current,
  className,
}: {
  values: Record<T, ReactNode>;
  current: T;
  className?: string;
}) {
  return (
    <span className={className ? `marfa-ix-swap ${className}` : 'marfa-ix-swap'}>
      {(Object.keys(values) as T[]).map((key) => (
        <span key={key} aria-hidden={key !== current || undefined} data-current={key === current || undefined}>
          {values[key]}
        </span>
      ))}
    </span>
  );
}

/**
 * The sentence under the controls that says what the current choice shows,
 * in plain text with `code` spans. It is as tall as the longest message at
 * any width, and a screen reader hears the current one announced.
 */
export function Result<T extends string>({ messages, current }: { messages: Record<T, string>; current: T }) {
  const values = Object.fromEntries(
    (Object.keys(messages) as T[]).map((key) => [key, <Inline key={key} text={messages[key]} />]),
  ) as Record<T, ReactNode>;
  return (
    <>
      <p className="marfa-ix-result">
        <Swap values={values} current={current} />
      </p>
      <p className="marfa-ix-live" aria-live="polite">
        {messages[current].replaceAll('`', '')}
      </p>
    </>
  );
}
