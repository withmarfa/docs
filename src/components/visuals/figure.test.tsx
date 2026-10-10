import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Arrow, Box, Branch, Branches, Figure } from './figure';

const heads = (html: string) => [...html.matchAll(/class="marfa-fig-head" data-end="(start|end)"/g)].map((m) => m[1]);

describe('Figure', () => {
  it('names itself by its caption when it has one, and by its label otherwise', () => {
    const captioned = renderToStaticMarkup(
      <Figure label="A label" caption="A caption">
        <Box title="One" />
      </Figure>,
    );
    expect(captioned).toContain('<figcaption class="marfa-fig-caption">A caption</figcaption>');
    expect(captioned).not.toContain('aria-label');

    const labeled = renderToStaticMarkup(
      <Figure label="A label">
        <Box title="One" />
      </Figure>,
    );
    expect(labeled).toContain('aria-label="A label"');
    expect(labeled).not.toContain('figcaption');
  });
});

describe('Arrow', () => {
  it('draws a head at each end its direction names', () => {
    expect(heads(renderToStaticMarkup(<Arrow direction="forward" />))).toEqual(['end']);
    expect(heads(renderToStaticMarkup(<Arrow direction="back" />))).toEqual(['start']);
    expect(heads(renderToStaticMarkup(<Arrow direction="both" />))).toEqual(['start', 'end']);
    expect(heads(renderToStaticMarkup(<Arrow direction="none" />))).toEqual([]);
  });
});

describe('Branches', () => {
  it('draws one leg and one cell per child, and tells the grid how many', () => {
    const html = renderToStaticMarkup(
      <Branches root={<Box title="Root" />}>
        <Box title="A" />
        <Box title="B" />
        <Box title="C" />
      </Branches>,
    );
    expect(html.match(/class="marfa-fig-leg"/g)).toHaveLength(3);
    expect(html.match(/class="marfa-fig-kid"/g)).toHaveLength(3);
    expect(html).toContain('--marfa-fig-n:3');
  });

  it('puts a single head on the stem when every branch points at the root', () => {
    const top = renderToStaticMarkup(
      <Branches root={<Box title="Root" />} head="root">
        <Box title="A" />
        <Box title="B" />
      </Branches>,
    );
    expect(heads(top)).toEqual(['start']);
    expect(top).toMatch(/class="marfa-fig-stem"[^>]*><svg class="marfa-fig-head" data-end="start"/);

    const bottom = renderToStaticMarkup(
      <Branches root={<Box title="Root" />} rootAt="bottom" head="root">
        <Box title="A" />
        <Box title="B" />
      </Branches>,
    );
    expect(heads(bottom)).toEqual(['end']);
    expect(bottom.indexOf('marfa-fig-kids')).toBeLessThan(bottom.indexOf('marfa-fig-root'));
  });

  it('gives each branch its own head and label where a Branch says so', () => {
    const html = renderToStaticMarkup(
      <Branches root={<Box title="Log" />}>
        <Branch head="root" label="pulls">
          <Box title="Stream" />
        </Branch>
        <Branch head="child" label="pushes">
          <Box title="Webhook" />
        </Branch>
      </Branches>,
    );
    // With the root on top, a head at the root is the start of a leg, and one at the child its end.
    expect(heads(html)).toEqual(['start', 'end']);
    expect(html).toContain('<span class="marfa-fig-leg-label">pulls</span>');
    expect(html).toContain('<span class="marfa-fig-leg-label">pushes</span>');
    expect(html).not.toMatch(/class="marfa-fig-stem"[^>]*><svg/);
  });
});
