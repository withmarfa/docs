import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getMDXComponents } from './mdx';

// What an MDX page can use without importing it. Rendering each one proves it
// is registered and that it draws on the server, which is where a page's
// first paint and its prerender happen.
describe('MDX components', () => {
  const { Tabs, Tab, Steps, Step, TypeTable, Accordions, Accordion, Files, Folder, File, Terminal, pre: Pre } =
    getMDXComponents();

  // A fenced block as rehype-code hands it to `pre`: a `code` of `span.line`s.
  const block = (...lines: string[]) => (
    <Pre className="shiki">
      <code>
        {lines.map((line, index) => (
          <span key={index} className="line">
            {line}
          </span>
        ))}
      </code>
    </Pre>
  );

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

  it('draws paged steps with every step in the page, the first one shown, and a count', () => {
    const html = renderToStaticMarkup(
      <Steps paged>
        <Step>
          <h3>Make a key</h3>
        </Step>
        <Step>
          <h3>Create the project</h3>
        </Step>
      </Steps>,
    );
    expect(html).toContain('Make a key');
    expect(html).toContain('Create the project');
    expect(html).toContain('1 of 2');
    expect(html).toContain('Next<span>Create the project</span>');
  });

  it('folds a long code block and leaves a short one whole', () => {
    expect(renderToStaticMarkup(block(...Array.from({ length: 30 }, (_, i) => `line ${i}`)))).toContain('Show all 30 lines');
    expect(renderToStaticMarkup(block('one', 'two'))).not.toContain('Show all');
  });

  it('draws a command with short output open and long output folded', () => {
    const short = renderToStaticMarkup(
      <Terminal>
        {block('marfa whoami')}
        {block('owner')}
      </Terminal>,
    );
    expect(short).toContain('marfa-terminal-output');
    expect(short).not.toContain('<details');
    const long = renderToStaticMarkup(
      <Terminal>
        {block('marfa housekeeping list')}
        {block(...Array.from({ length: 9 }, (_, i) => `job ${i}`))}
      </Terminal>,
    );
    expect(long).toContain('Output, 9 lines');
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
