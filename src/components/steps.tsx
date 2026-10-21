import { Step as BaseStep, Steps as BaseSteps } from 'fumadocs-ui/components/steps';
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Step = BaseStep;

/**
 * Fumadocs' Steps, or with `paged` one step at a time in a card: a step
 * indicator and Previous and Next buttons in a row that stays put, the step,
 * and a button to the next one. Every step stays in the page, hidden with
 * `hidden="until-found"`, so the browser's find and a link to a heading inside
 * one still reach it, print and a page without script show them all, and the
 * Markdown copy keeps them all.
 */
export function Steps({ paged, children }: { paged?: boolean; children: ReactNode }) {
  if (!paged) return <BaseSteps>{children}</BaseSteps>;
  return <PagedSteps>{children}</PagedSteps>;
}

type WithChildren = { children?: ReactNode };

/** The text of the first heading in a step, which names it. */
function titleOf(step: ReactNode): string {
  const text = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(text).join('');
    if (isValidElement<WithChildren>(node)) return text(node.props.children);
    return '';
  };
  if (!isValidElement<WithChildren>(step)) return '';
  // A step opens with its heading, as STYLE.md asks.
  return text(Children.toArray(step.props.children).find(isValidElement)).trim();
}

/** Above this many steps, dots get too small to count, so the indicator shows "n of m". */
const MAX_DOTS = 8;

function PagedSteps({ children }: { children: ReactNode }) {
  const steps = Children.toArray(children).filter(isValidElement) as ReactElement<WithChildren>[];
  const titles = steps.map(titleOf);
  const [current, setCurrent] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  // The body's height before a move, to animate from, and whether focus follows the move.
  const before = useRef<number | null>(null);
  const focusStep = useRef(false);
  const last = steps.length - 1;

  useLayoutEffect(() => {
    // React writes `hidden` as a boolean, so the until-found value is set here.
    panels.current.forEach((panel, index) => {
      if (panel && index !== current) panel.setAttribute('hidden', 'until-found');
    });
    if (focusStep.current) panels.current[current]?.focus({ preventScroll: true });
    focusStep.current = false;

    const element = body.current;
    const from = before.current;
    before.current = null;
    if (!element || from === null) return;
    const to = element.offsetHeight;
    if (from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    element.style.overflow = 'clip';
    element
      .animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' })
      .finished.catch(() => {})
      .finally(() => {
        element.style.overflow = '';
      });
  }, [current]);

  // A find or a link that lands in a hidden step opens it.
  useEffect(() => {
    const cleanups = panels.current.map((panel, index) => {
      if (!panel) return () => {};
      const open = () => setCurrent(index);
      panel.addEventListener('beforematch', open);
      return () => panel.removeEventListener('beforematch', open);
    });
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      const index = target ? panels.current.findIndex((panel) => panel?.contains(target)) : -1;
      if (index >= 0) setCurrent(index);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => {
      cleanups.forEach((cleanup) => cleanup());
      window.removeEventListener('hashchange', fromHash);
    };
  }, []);

  const go = useCallback(
    (index: number, fromBelow = false) => {
      if (index < 0 || index > last) return;
      before.current = body.current?.offsetHeight ?? null;
      focusStep.current = fromBelow;
      setCurrent(index);
      // Back to the card's top when the reader has scrolled past it, below the sticky header.
      const card = root.current;
      if (card && card.getBoundingClientRect().top < parseFloat(getComputedStyle(card).scrollMarginTop || '0')) {
        card.scrollIntoView({ block: 'start' });
      }
    },
    [last],
  );

  return (
    <div ref={root} className="marfa-paged">
      <div className="marfa-paged-head">
        <div className="marfa-paged-indicator" aria-hidden="true">
          {steps.length > MAX_DOTS
            ? `${current + 1} of ${steps.length}`
            : steps.map((_, index) => <span key={index} data-dot="" data-current={index === current || undefined} />)}
        </div>
        <span className="sr-only" aria-live="polite">
          {`Step ${current + 1} of ${steps.length}: ${titles[current]}`}
        </span>
        <button
          type="button"
          className="marfa-paged-arrow"
          aria-label="Previous step"
          aria-disabled={current === 0}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="marfa-paged-arrow"
          aria-label="Next step"
          aria-disabled={current === last}
          onClick={() => go(current + 1)}
        >
          <ChevronRight strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
      <div ref={body}>
        {steps.map((step, index) => (
          <div
            key={index}
            ref={(element) => {
              panels.current[index] = element;
            }}
            className="marfa-paged-step"
            hidden={index !== current}
            role="group"
            aria-label={`Step ${index + 1} of ${steps.length}`}
            tabIndex={-1}
          >
            {step.props.children}
          </div>
        ))}
        {current < last ? (
          <button type="button" className="marfa-paged-next" onClick={() => go(current + 1, true)}>
            Next: {titles[current + 1]}
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
