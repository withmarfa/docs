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
import { iconButton } from './site-header';

export const Step = BaseStep;

/**
 * Fumadocs' Steps, or with `paged` one step at a time: a progress bar with the
 * count and Previous and Next arrows above the step, and a quiet link to the
 * next step after it. Every step stays in the page, hidden with
 * `hidden="until-found"`, so the browser's find and a link to a heading inside
 * one still reach it, and the Markdown copy keeps them all.
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

function PagedSteps({ children }: { children: ReactNode }) {
  const steps = Children.toArray(children).filter(isValidElement) as ReactElement<WithChildren>[];
  const titles = steps.map(titleOf);
  const [current, setCurrent] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const last = steps.length - 1;

  // React writes `hidden` as a boolean, so the until-found value is set here.
  useLayoutEffect(() => {
    panels.current.forEach((panel, index) => {
      if (panel && index !== current) panel.setAttribute('hidden', 'until-found');
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

  const go = useCallback((index: number) => {
    setCurrent(index);
    // Back to the top of the steps when the reader has scrolled past it, under the sticky header.
    const top = root.current?.getBoundingClientRect().top ?? 0;
    if (top < 64) root.current?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <div ref={root} className="marfa-paged">
      <div className="marfa-paged-head">
        <div className="marfa-paged-track">
          {titles.map((title, index) => (
            <button
              key={index}
              type="button"
              className="marfa-paged-segment"
              aria-label={`Step ${index + 1}: ${title}`}
              title={title}
              aria-current={index === current ? 'step' : undefined}
              data-done={index < current || undefined}
              onClick={() => go(index)}
            />
          ))}
        </div>
        <span className="marfa-paged-count" aria-live="polite">
          {current + 1} of {steps.length}
        </span>
        <button
          type="button"
          className={iconButton}
          aria-label="Previous step"
          disabled={current === 0}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label="Next step"
          disabled={current === last}
          onClick={() => go(current + 1)}
        >
          <ChevronRight strokeWidth={1.75} />
        </button>
      </div>
      {steps.map((step, index) => (
        <div
          key={index}
          ref={(element) => {
            panels.current[index] = element;
          }}
          className="marfa-paged-step"
          hidden={index !== current}
          aria-label={`Step ${index + 1} of ${steps.length}`}
          role="group"
        >
          {step.props.children}
        </div>
      ))}
      {current < last ? (
        <button type="button" className="marfa-paged-next" onClick={() => go(current + 1)}>
          Next: {titles[current + 1]}
          <ChevronRight strokeWidth={1.75} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
