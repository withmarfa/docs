import { Children, isValidElement, type CSSProperties, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * A static figure: boxes, groups and the lines between them, laid out by flex
 * and grid on the theme's tokens. Everything renders on the server and needs no
 * script. Below 34rem of figure width, every horizontal layout
 * turns into a column, so a figure fits a phone without scrolling sideways.
 */
export function Figure({
  label,
  caption,
  children,
  className,
}: {
  /** Names the figure for assistive technology when there is no caption. */
  label?: string;
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn('marfa-fig not-prose', className)} aria-label={caption ? undefined : label}>
      <div className="marfa-fig-body">{children}</div>
      {caption ? <figcaption className="marfa-fig-caption">{caption}</figcaption> : null}
    </figure>
  );
}

export type Tone = 'default' | 'accent' | 'dashed';

/**
 * One thing in a figure. `subtitle` is a few words on one line; `children`
 * holds anything the box contains, such as chips or rows.
 */
export function Box({
  title,
  subtitle,
  icon: Icon,
  tone = 'default',
  aside,
  children,
  className,
  highlight,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** Set at the end of the title row, such as a version. */
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** For an interactive figure: lights the box without changing its size. */
  highlight?: boolean;
}) {
  return (
    <div className={cn('marfa-fig-box', className)} data-tone={tone} data-highlight={highlight || undefined}>
      <div className="marfa-fig-box-title">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <span className="marfa-fig-box-name">{title}</span>
        {aside ? <span className="marfa-fig-box-aside">{aside}</span> : null}
      </div>
      {subtitle ? <div className="marfa-fig-box-subtitle">{subtitle}</div> : null}
      {children ? <div className="marfa-fig-box-content">{children}</div> : null}
    </div>
  );
}

/** A labeled container holding boxes, or anything else. */
export function Group({
  label,
  subtitle,
  icon: Icon,
  tone = 'default',
  children,
  className,
}: {
  label: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('marfa-fig-group', className)} data-tone={tone}>
      <div className="marfa-fig-group-head">
        <div className="marfa-fig-group-label">
          {Icon ? <Icon aria-hidden="true" /> : null}
          <span>{label}</span>
        </div>
        {subtitle ? <div className="marfa-fig-group-subtitle">{subtitle}</div> : null}
      </div>
      <div className="marfa-fig-group-body">{children}</div>
    </div>
  );
}

/** A small label inside a box, such as one kind of thing it holds. */
export function Chip({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <span className="marfa-fig-chip">
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/**
 * Which way an arrow points along its axis: `forward` is right or down, `back`
 * is left or up. `none` draws a plain line.
 */
export type ArrowDirection = 'forward' | 'back' | 'both' | 'none';

/**
 * How a line lies. `auto` follows the flow it sits in: across while the figure
 * is wide, down once it turns into a column.
 */
export type Axis = 'auto' | 'across' | 'down';

/** An arrowhead that points right as drawn; the stylesheet turns it where it sits. */
export function ArrowHead({ end = 'end' }: { end?: 'start' | 'end' }) {
  return (
    <svg className="marfa-fig-head" data-end={end} viewBox="0 0 8 8" aria-hidden="true" focusable="false">
      <path d="M0 0.5 L7.5 4 L0 7.5 Z" />
    </svg>
  );
}

/**
 * A line between two neighbors in a `Flow`, with an optional label of a few
 * words. It stretches to fill the room its flow gives it.
 */
export function Arrow({
  label,
  direction = 'forward',
  dashed = false,
  axis = 'auto',
  className,
}: {
  label?: ReactNode;
  direction?: ArrowDirection;
  dashed?: boolean;
  axis?: Axis;
  className?: string;
}) {
  return (
    <div
      className={cn('marfa-fig-arrow', className)}
      data-axis={axis}
      data-direction={direction}
      data-dashed={dashed || undefined}
    >
      <span className="marfa-fig-arrow-track" aria-hidden="true">
        {direction === 'back' || direction === 'both' ? <ArrowHead end="start" /> : null}
        <span className="marfa-fig-arrow-line" />
        {direction === 'forward' || direction === 'both' ? <ArrowHead end="end" /> : null}
      </span>
      {label ? <span className="marfa-fig-arrow-label">{label}</span> : null}
    </div>
  );
}

/**
 * Boxes and arrows in a line. `auto` lays them across while the figure is
 * wide and down once it is narrow; the arrows inside turn with it.
 */
export function Flow({
  axis = 'auto',
  align = 'center',
  children,
  className,
}: {
  axis?: Axis;
  /** How items line up across the flow. `stretch` gives them all one height. */
  align?: 'center' | 'stretch' | 'start';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('marfa-fig-flow', className)} data-axis={axis} data-align={align}>
      {children}
    </div>
  );
}

/**
 * One child of `Branches` that needs its own line: an arrowhead that differs
 * from the rest, or a label. Both are drawn on the bus, so a set of branches
 * that has them should keep `stack="never"`.
 */
export function Branch({ children }: { head?: BranchHead; label?: ReactNode; children: ReactNode }) {
  return <>{children}</>;
}

/**
 * Where a branch's arrowhead points: at the root, at the child, or nowhere.
 */
export type BranchHead = 'root' | 'child' | 'none';

/**
 * One root joined to several children by a bus, like a tree. While the figure
 * is wide, the children sit side by side and the bus runs across; once it is
 * narrow, they stack under the root and the bus becomes a rail down their
 * left. Without a `root`, the stem joins whatever sits just before (or after)
 * the branches in the figure.
 */
export function Branches({
  root,
  rootAt = 'top',
  head = 'none',
  stack = 'auto',
  children,
  className,
}: {
  root?: ReactNode;
  /** `bottom` draws the children first and joins them down into the root. */
  rootAt?: 'top' | 'bottom';
  /** The arrowhead every branch gets unless a `Branch` says otherwise. */
  head?: BranchHead;
  /** `never` keeps the children side by side at every width. */
  stack?: 'auto' | 'never';
  children: ReactNode;
  className?: string;
}) {
  const kids = Children.toArray(children).filter(isValidElement);
  const legs = kids.map((kid) => {
    const own = kid.type === Branch ? (kid.props as { head?: BranchHead; label?: ReactNode }) : {};
    return { head: own.head ?? head, label: own.label };
  });
  const toRoot = legs.every((leg) => leg.head === 'root');
  const style = { '--marfa-fig-n': kids.length } as CSSProperties;

  const stem = (
    <div className="marfa-fig-stem" aria-hidden="true">
      {toRoot ? <ArrowHead end={rootAt === 'top' ? 'start' : 'end'} /> : null}
    </div>
  );
  const bus = (
    <div className="marfa-fig-bus" aria-hidden={legs.some((leg) => leg.label) ? undefined : true}>
      {legs.map((leg, index) => (
        <div key={index} className="marfa-fig-leg" data-head={toRoot ? 'none' : leg.head}>
          {!toRoot && leg.head !== 'none' ? (
            <ArrowHead end={(leg.head === 'root') === (rootAt === 'top') ? 'start' : 'end'} />
          ) : null}
          {leg.label ? <span className="marfa-fig-leg-label">{leg.label}</span> : null}
        </div>
      ))}
    </div>
  );
  const children_ = (
    <div className="marfa-fig-kids">
      {kids.map((kid, index) => (
        <div key={index} className="marfa-fig-kid" data-head={toRoot ? 'none' : legs[index].head}>
          {kid}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={cn('marfa-fig-branches', className)}
      data-root-at={rootAt}
      data-stack={stack}
      data-rooted={root ? true : undefined}
      data-to-root={toRoot || undefined}
      style={style}
    >
      {rootAt === 'top' ? (
        <>
          {root ? <div className="marfa-fig-root">{root}</div> : null}
          {stem}
          {bus}
          {children_}
        </>
      ) : (
        <>
          {children_}
          {bus}
          {stem}
          {root ? <div className="marfa-fig-root">{root}</div> : null}
        </>
      )}
    </div>
  );
}
