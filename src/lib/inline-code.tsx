import type { ReactNode } from 'react';

// A span is a backtick, at least one character that is not a backtick, and the
// closing backtick. A backtick with no partner stays in the text as it is.
const CODE_SPAN = /`([^`]+)`/g;

/**
 * Turns the inline code in a one-line Markdown description into `<code>` and
 * leaves every other character as text. React escapes the text, so nothing in
 * a description reaches the page as markup.
 */
export function renderInlineCode(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let end = 0;
  for (const match of text.matchAll(CODE_SPAN)) {
    if (match.index > end) nodes.push(text.slice(end, match.index));
    nodes.push(<code key={match.index}>{match[1]}</code>);
    end = match.index + match[0].length;
  }
  if (end < text.length) nodes.push(text.slice(end));
  return nodes;
}
