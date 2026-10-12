import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { findSteps, Sequence } from './sequence';

// What MDX hands the component for a `1.` list: an `ol` of `li`, with the
// line breaks between them as strings.
const list = (
  <ol>
    {'\n'}
    <li>
      Read the note at <code>version</code> 3.
    </li>
    {'\n'}
    <li>
      Write, naming <a href="/get-started/items-and-types">the version</a>.
    </li>
    {'\n'}
    <li>Read it again.</li>
    {'\n'}
  </ol>
);

describe('Sequence', () => {
  it('finds the list and each of its steps', () => {
    const found = findSteps(list);
    expect(found?.steps).toHaveLength(3);
  });

  it('renders every step at once, in order, on a timeline', () => {
    const html = renderToStaticMarkup(<Sequence title="Writing">{list}</Sequence>);
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toMatch(/<li>Read the note at <code>version<\/code> 3\.<\/li>/);
    expect(html).toContain('<a href="/get-started/items-and-types">the version</a>');
    expect(html).toContain('<ol class="marfa-seq-list">');
    expect(html).toContain('<span class="marfa-seq-title">Writing</span>');
  });

  it('has no controls to step through', () => {
    const html = renderToStaticMarkup(<Sequence title="Writing">{list}</Sequence>);
    expect(html).not.toContain('button');
    expect(html).not.toContain('data-current');
  });

  it('shows children that hold no list of steps as they are, with no controls', () => {
    const html = renderToStaticMarkup(
      <Sequence title="Writing">
        <p>Only a paragraph.</p>
      </Sequence>,
    );
    expect(html).toBe('<div class="marfa-seq-plain"><p>Only a paragraph.</p></div>');
  });
  it('shows children with anything beside the list as they are', () => {
    const html = renderToStaticMarkup(
      <Sequence title="Writing">
        <p>
          Read <code>a</code> and <code>b</code> first.
        </p>
        {list}
      </Sequence>,
    );
    expect(html).toContain('Read <code>a</code> and <code>b</code> first.');
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).not.toContain('marfa-seq-controls');
  });
});
