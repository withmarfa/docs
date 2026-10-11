import {
  Children,
  cloneElement,
  isValidElement,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Element = ReactElement<{ children?: ReactNode; className?: string }>;

/**
 * The ordered list a `Sequence` wraps and its items, or `null` when its
 * children are anything but one ordered list, in which case the sequence shows
 * them as they are.
 */
export function findSteps(children: ReactNode): { list: Element; steps: Element[] } | null {
  const nodes = Children.toArray(children).filter(
    (node) => typeof node !== 'string' || node.trim() !== '',
  );
  const [list] = nodes;
  if (nodes.length !== 1 || !isValidElement(list) || list.type !== 'ol') return null;
  const steps = Children.toArray((list as Element).props.children).filter(
    isValidElement,
  ) as Element[];
  return steps.length > 1 ? { list: list as Element, steps } : null;
}

/**
 * An ordered list shown one step at a time, with Previous and Next. The MDX
 * holds a plain `1.` list, so the page's Markdown copy keeps every step.
 *
 * Every step sits in one grid cell and only the current one is visible, so the
 * box keeps the height of the tallest step and nothing moves between steps.
 * Without scripting, the stylesheet shows the whole list and hides the
 * controls; with scripting, it shows the first step from the server render
 * on, so the page doesn't jump when it hydrates.
 */
export function Sequence({ title, children }: { title: string; children: ReactNode }) {
  const found = findSteps(children);
  const [step, setStep] = useState(0);

  if (!found) return <div className="marfa-seq-plain">{children}</div>;

  const { list, steps } = found;
  const last = steps.length - 1;
  const go = (to: number) => setStep(Math.min(Math.max(to, 0), last));

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') go(step + 1);
    else if (event.key === 'ArrowLeft') go(step - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(last);
    else return;
    event.preventDefault();
  }

  return (
    <section className="marfa-seq" aria-label={title}>
      <header className="marfa-seq-head">
        <span className="marfa-seq-title">{title}</span>
        <span className="marfa-seq-count" aria-live="polite">
          Step {step + 1} of {steps.length}
        </span>
      </header>
      {cloneElement(list, {
        className: 'marfa-seq-list',
        children: steps.map((item, index) =>
          cloneElement(item as ReactElement<Record<string, unknown>>, {
            key: index,
            'data-current': index === step ? '' : undefined,
          }),
        ),
      })}
      <div className="marfa-seq-controls" role="group" aria-label={`${title}: steps`} onKeyDown={onKeyDown}>
        <button
          type="button"
          className="marfa-seq-button"
          aria-disabled={step === 0}
          onClick={() => go(step - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Previous
        </button>
        <span className="marfa-seq-progress" aria-hidden="true">
          {steps.map((_, index) => (
            <span key={index} data-done={index <= step || undefined} />
          ))}
        </span>
        <button
          type="button"
          className="marfa-seq-button"
          aria-disabled={step === last}
          onClick={() => go(step + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
