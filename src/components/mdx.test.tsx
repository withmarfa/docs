import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getMDXComponents } from './mdx';

// What an MDX page can use without importing it. Rendering each one proves it
// is registered and that it draws on the server, which is where a page's
// first paint and its prerender happen.
describe('MDX components', () => {
  const { Tabs, Tab, Steps, Step, TypeTable, Accordions, Accordion, Files, Folder, File } =
    getMDXComponents();

  it('draws tabs, each with its label and its body', () => {
    const html = renderToStaticMarkup(
      <Tabs items={['One', 'Two']}>
        <Tab value="One">First body</Tab>
        <Tab value="Two">Second body</Tab>
      </Tabs>,
    );
    expect(html).toContain('One');
    expect(html).toContain('Two');
    expect(html).toContain('First body');
  });

  it('draws numbered steps', () => {
    const html = renderToStaticMarkup(
      <Steps>
        <Step>First step</Step>
        <Step>Second step</Step>
      </Steps>,
    );
    expect(html).toContain('First step');
    expect(html).toContain('Second step');
  });

  it('draws a type table with its field names and types', () => {
    const html = renderToStaticMarkup(
      <TypeTable type={{ title: { description: 'The title.', type: 'string', required: true } }} />,
    );
    expect(html).toContain('title');
    expect(html).toContain('string');
  });

  it('draws an accordion with its title', () => {
    const html = renderToStaticMarkup(
      <Accordions type="single">
        <Accordion title="Why">Because.</Accordion>
      </Accordions>,
    );
    expect(html).toContain('Why');
  });

  it('draws a file tree', () => {
    const html = renderToStaticMarkup(
      <Files>
        <Folder name="docs" defaultOpen>
          <File name="index.mdx" />
        </Folder>
      </Files>,
    );
    expect(html).toContain('docs');
    expect(html).toContain('index.mdx');
  });
});
