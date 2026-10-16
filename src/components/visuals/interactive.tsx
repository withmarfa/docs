import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The controls of an interactive figure: one or more labeled groups of
 * buttons and a reset. Each button is a toggle (`aria-pressed`), and pressing
 * one changes what the figure highlights and says, never its layout.
 */
export function Controls({ children, onReset }: { children: ReactNode; onReset: () => void }) {
  return (
    <div className="marfa-ix-controls">
      {children}
      <button type="button" className="marfa-ix-button marfa-ix-reset" aria-label="Reset" title="Reset" onClick={onReset}>
        <RotateCcw aria-hidden="true" />
      </button>
    </div>
  );
}

/** One labeled group of choices, with at most one pressed. */
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: ReactNode }[];
  /** The pressed choice, or null when none is. */
  value: T | null;
  onChange: (id: T) => void;
}) {
  return (
    <div className="marfa-ix-group" role="group" aria-label={label}>
      <span className="marfa-ix-label" aria-hidden="true">
        {label}
      </span>
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

/** Text with `code` spans between backticks, drawn as inline code. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, index) => (index % 2 ? <code key={index}>{part}</code> : part))}
    </>
  );
}

/**
 * The one line a figure shows for its state, in plain text with `code` spans.
 * Every message sits in one grid cell, so the line is as tall as the longest
 * at any width, and a screen reader hears the current one announced.
 */
export function Result<T extends string>({ messages, current }: { messages: Record<T, string>; current: T | null }) {
  return (
    <>
      <p className="marfa-ix-result">
        {(Object.keys(messages) as T[]).map((key) => (
          <span key={key} aria-hidden={key !== current || undefined} data-current={key === current || undefined}>
            <Inline text={messages[key]} />
          </span>
        ))}
      </p>
      <p className="marfa-ix-live" aria-live="polite">
        {current ? messages[current].replaceAll('`', '') : ''}
      </p>
    </>
  );
}
