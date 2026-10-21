import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { ChevronRight } from 'lucide-react';
import {
  Children,
  createElement,
  isValidElement,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';

/** A code block taller than this folds to its first lines, with a button to show the rest. */
export const FOLD_AT = 24;
/** Command output longer than this starts closed. */
export const OUTPUT_FOLD_AT = 6;

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

/**
 * The `pre` of every Markdown code block: Fumadocs' code block, folded to its
 * first lines when it is long, so a page doesn't open on a wall of code. The
 * fold hides lines from view only; Copy and the Markdown copy take them all.
 */
export function FoldingCodeBlock(props: ComponentProps<'pre'>) {
  const lines = countLines(createElement('pre', props));
  const block = (
    <CodeBlock {...(props as ComponentProps<typeof CodeBlock>)}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  );
  if (lines <= FOLD_AT) return block;
  return <Fold lines={lines}>{block}</Fold>;
}

function Fold({ lines, children }: { lines: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="marfa-fold" data-open={open || undefined}>
      {children}
      <button type="button" className="marfa-fold-button" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Show less' : `Show all ${lines} lines`}
      </button>
    </div>
  );
}

/**
 * A command and what it prints, as one block: the command with its copy
 * button, then the output in muted text. Output longer than a few lines
 * starts closed. Written in MDX as two fenced blocks inside `<Terminal>`.
 */
/** The code block inside whatever MDX wrapped around a fenced block. */
function findBlock(node: ReactNode): ReactElement<ComponentProps<'pre'>> | undefined {
  if (!isValidElement<{ children?: ReactNode }>(node)) return undefined;
  if (node.type === FoldingCodeBlock) return node as ReactElement<ComponentProps<'pre'>>;
  for (const child of Children.toArray(node.props.children)) {
    const found = findBlock(child);
    if (found) return found;
  }
  return undefined;
}

export function Terminal({ children }: { children: ReactNode }) {
  const [command, output] = Children.toArray(children).filter(isValidElement);
  const block = findBlock(output);
  if (!block) return <>{children}</>;
  const { icon: _icon, ...pre } = block.props as ComponentProps<'pre'> & { icon?: unknown };
  const lines = countLines(createElement('pre', pre));
  // The output keeps Shiki's markup but not the code block around it, so it has
  // no copy button or fold of its own.
  const body = <div className="marfa-terminal-output">{createElement('pre', pre)}</div>;
  return (
    <div className="marfa-terminal not-prose">
      {command}
      {lines > OUTPUT_FOLD_AT ? (
        <details className="marfa-terminal-fold">
          <summary>
            <ChevronRight aria-hidden="true" />
            Output, {lines} lines
          </summary>
          {body}
        </details>
      ) : (
        body
      )}
    </div>
  );
}
