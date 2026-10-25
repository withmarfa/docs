import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import {
  Children,
  createContext,
  createElement,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';
import { statusLabel, statusTone } from '../lib/http-status';

/** A code block, or a terminal body, taller than this folds to its first lines, with a button to show the rest. */
export const FOLD_AT = 24;

/** True inside a code tab set, where the tabs are the block's header row. */
export const InCodeTabs = createContext(false);

type Props = { className?: string; children?: ReactNode };

/**
 * The number of lines in a highlighted block. Shiki writes each line as a
 * `span.line` inside the block's `code`, so this works the same on the server
 * and in the browser, before anything is measured.
 */
export function countLines(pre: ReactNode): number {
  if (!isValidElement<Props>(pre)) return 0;
  const code = Children.toArray(pre.props.children).find(isValidElement) as ReactElement<Props> | undefined;
  return Children.toArray(code?.props.children).filter(
    (child) => isValidElement<Props>(child) && child.props.className?.split(' ').includes('line'),
  ).length;
}

/** What a fenced block's meta adds to the header: `title="Response" note="Server-sent events" status="200"`. */
type BlockProps = Omit<ComponentProps<'pre'>, 'title'> & {
  title?: string;
  note?: string;
  status?: string | number;
  allowCopy?: boolean | string;
  icon?: unknown;
};

/** Stands in for an absent title when a note or status gives the header row something to hold. */
const NO_TITLE = <></>;

function Status({ code }: { code: string }) {
  const tone = statusTone(code);
  return (
    <span className="marfa-code-status" data-tone={tone}>
      {statusLabel(code)}
    </span>
  );
}

/**
 * The header's right-hand side: an optional note or status chip, then Copy.
 * Fumadocs calls this where it draws its Copy button, so the extras sit
 * in the same row without a header of our own.
 */
function actions(note: string | undefined, status: string | undefined) {
  return function Actions({ className, children }: ComponentProps<'div'>) {
    return (
      <>
        {note ? <span className="marfa-code-note">{note}</span> : null}
        {status ? <Status code={status} /> : null}
        <div className={cn('empty:hidden', className)}>{children}</div>
      </>
    );
  };
}

/**
 * The `pre` of every Markdown code block: Fumadocs' code block under one
 * header row, folded to its first lines when it is long, so a page doesn't
 * open on a wall of code. The fold hides lines from view only; Copy and the
 * Markdown copy take them all. In a code tab set the tabs are the header row
 * and the stylesheet moves Copy into it.
 */
export function FoldingCodeBlock({ title, note, status, icon: _icon, ...props }: BlockProps) {
  return (
    <CodeBlockCard
      lines={countLines(createElement('pre', props))}
      title={title}
      note={note}
      status={status === undefined ? undefined : String(status)}
      block={props as ComponentProps<typeof CodeBlock>}
    >
      <Pre>{props.children}</Pre>
    </CodeBlockCard>
  );
}

function CodeBlockCard({
  lines,
  title,
  note,
  status,
  block,
  children,
}: {
  lines: number;
  title?: string;
  note?: string;
  status?: string;
  block: ComponentProps<typeof CodeBlock>;
  children: ReactNode;
}) {
  return (
    <InCodeTabs.Consumer>
      {(inTabs) => {
        const header = !inTabs && Boolean(title || note || status);
        const card = (
          <CodeBlock
            {...block}
            title={header ? title || NO_TITLE : undefined}
            Actions={header ? actions(note, status) : undefined}
          >
            {children}
          </CodeBlock>
        );
        return lines > FOLD_AT ? (
          <Fold lines={lines} inTabs={inTabs}>
            {card}
          </Fold>
        ) : (
          card
        );
      }}
    </InCodeTabs.Consumer>
  );
}

function Fold({ lines, inTabs, children }: { lines: number; inTabs: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="marfa-fold" data-in-tabs={inTabs || undefined} data-open={open || undefined}>
      {children}
      <button type="button" className="marfa-fold-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Show less' : `Show all ${lines} lines`}
      </button>
    </div>
  );
}

/** The code block inside whatever MDX wrapped around a fenced block. */
function findBlock(node: ReactNode): ReactElement<BlockProps> | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === FoldingCodeBlock) return node as ReactElement<BlockProps>;
  for (const child of Children.toArray(node.props.children)) {
    const found = findBlock(child);
    if (found) return found;
  }
  return undefined;
}

/**
 * A command and what it prints, as one block under a "Terminal" header: the
 * command, then its output in muted text, and Copy takes the command only.
 * Written in MDX as two fenced blocks inside `<Terminal>`. The whole body folds
 * like any block, by its total number of lines.
 */
export function Terminal({ children }: { children: ReactNode }) {
  const [command, output] = Children.toArray(children).filter(isValidElement);
  const first = findBlock(command);
  const second = findBlock(output);
  if (!first || !second) return <>{children}</>;
  const { title: _title, note: _note, status: _status, icon: _icon, ...block } = first.props;
  return (
    <CodeBlockCard
      lines={countLines(createElement('pre', first.props)) + countLines(createElement('pre', second.props))}
      title="Terminal"
      block={{ ...block, className: cn(block.className, 'marfa-terminal') } as ComponentProps<typeof CodeBlock>}
    >
      <Pre>{first.props.children}</Pre>
      <Pre className="marfa-terminal-output">{second.props.children}</Pre>
    </CodeBlockCard>
  );
}
