import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { renderInlineCode } from './inline-code';

const html = (text: string) => renderToStaticMarkup(<>{renderInlineCode(text)}</>);

describe('renderInlineCode', () => {
  it('leaves plain text as it is', () => {
    expect(html('Lists items.')).toBe('Lists items.');
  });

  it('renders one code span', () => {
    expect(html('Matches `source_id` on the item.')).toBe(
      'Matches <code>source_id</code> on the item.',
    );
  });

  it('renders two code spans', () => {
    expect(html('Sets `id` and `acknowledged: true`.')).toBe(
      'Sets <code>id</code> and <code>acknowledged: true</code>.',
    );
  });

  it('keeps an unmatched backtick as text', () => {
    expect(html('Odd `one')).toBe('Odd `one');
    expect(html('A `span` and a stray ` here')).toBe('A <code>span</code> and a stray ` here');
    expect(html('Empty `` pair')).toBe('Empty `` pair');
  });

  it('escapes HTML characters inside and outside a span', () => {
    expect(html('1 < 2 & `<b>x&y</b>`')).toBe('1 &lt; 2 &amp; <code>&lt;b&gt;x&amp;y&lt;/b&gt;</code>');
  });
});
