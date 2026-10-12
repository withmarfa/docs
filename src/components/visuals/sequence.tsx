import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

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
 * An ordered list shown as a numbered timeline, every step visible at once, so
 * a reader sees the whole story and order in time is the shape. The MDX holds
 * a plain `1.` list, so the page's Markdown copy keeps every step.
 */
export function Sequence({ title, children }: { title: string; children: ReactNode }) {
  const found = findSteps(children);
  if (!found) return <div className="marfa-seq-plain">{children}</div>;

  const { list, steps } = found;
  return (
    <section className="marfa-seq" aria-label={title}>
      <header className="marfa-seq-head">
        <span className="marfa-seq-title">{title}</span>
      </header>
      {cloneElement(list, {
        className: 'marfa-seq-list',
        children: steps.map((item, index) =>
          cloneElement(item as ReactElement<Record<string, unknown>>, { key: index }),
        ),
      })}
    </section>
  );
}
