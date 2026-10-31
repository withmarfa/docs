import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReferenceList } from './reference-list';

function table(rows: string[][]) {
  const [header, ...body] = rows;
  return (
    <div className="wrapper">
      <table>
        <thead>
          <tr>
            {header.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => (
                <td key={cell}>
                  <code>{cell}</code>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

describe('ReferenceList', () => {
  it('draws each row as an entry: its name, its details with their headers, then its description', () => {
    const html = renderToStaticMarkup(
      <ReferenceList>
        {table([
          ['Job', 'What it does', 'Runs every'],
          ['trash-purge', 'Purges the trash.', '1 hour'],
          ['heartbeat', 'Sends a request.', '1 minute'],
        ])}
      </ReferenceList>,
    );
    expect(html).not.toContain('<table');
    expect(html.match(/class="marfa-ref-entry"/g)).toHaveLength(2);
    expect(html).toContain(
      '<dt class="marfa-ref-name"><code>trash-purge</code></dt><dd class="marfa-ref-detail"><span class="marfa-ref-label">Runs every</span> <code>1 hour</code></dd><dd class="marfa-ref-description"><code>Purges the trash.</code></dd>',
    );
  });

  it('takes the description from the column it is told', () => {
    const html = renderToStaticMarkup(
      <ReferenceList description={2}>
        {table([
          ['Code', 'Status', 'Meaning'],
          ['not_found', '404', 'No such path.'],
        ])}
      </ReferenceList>,
    );
    expect(html).toContain('<span class="marfa-ref-label">Status</span> <code>404</code>');
    expect(html).toContain('<dd class="marfa-ref-description"><code>No such path.</code></dd>');
  });

  it('leaves out a detail whose cell is empty, and keeps it where the cell has a value', () => {
    const html = renderToStaticMarkup(
      <ReferenceList description={2}>
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Type</th>
              <th>Description</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>title</td>
              <td>string</td>
              <td>The name.</td>
              <td></td>
            </tr>
            <tr>
              <td>required</td>
              <td>boolean</td>
              <td>Whether it must be set.</td>
              <td>false</td>
            </tr>
          </tbody>
        </table>
      </ReferenceList>,
    );
    const [title, required] = html.split('class="marfa-ref-entry"').slice(1);
    expect(title).toContain('<span class="marfa-ref-label">Type</span> string');
    expect(title).not.toContain('Default');
    expect(required).toContain('<span class="marfa-ref-label">Default</span> false');
  });

  it('draws each table of an included file as its own list, and keeps the heading over it', () => {
    const html = renderToStaticMarkup(
      <ReferenceList>
        <>
          <h2 id="core-types">Core types</h2>
        {table([
          ['Type', 'Description'],
          ['core.note', 'Text you wrote.'],
        ])}
        <h2 id="system-types">System types</h2>
        {table([
          ['Type', 'Description'],
          ['system.view', 'A saved list.'],
        ])}
        </>
      </ReferenceList>,
    );
    expect(html.match(/<dl class="marfa-ref">/g)).toHaveLength(2);
    expect(html.match(/class="marfa-ref-entry"/g)).toHaveLength(2);
    expect(html).not.toContain('<code>Type</code>');
    expect(html.indexOf('id="system-types"')).toBeGreaterThan(html.indexOf('core.note'));
    expect(html.indexOf('id="system-types"')).toBeLessThan(html.indexOf('system.view'));
  });

  it('leaves out a detail that reads None', () => {
    const html = renderToStaticMarkup(
      <ReferenceList>
        <table>
          <tbody>
            <tr>
              <th>Variable</th>
              <th>What it does</th>
              <th>Default</th>
            </tr>
            <tr>
              <td>HOST</td>
              <td>Where it goes.</td>
              <td>None</td>
            </tr>
          </tbody>
        </table>
      </ReferenceList>,
    );
    expect(html).not.toContain('Default');
  });

  it('leaves its children alone when they hold no table with rows', () => {
    const html = renderToStaticMarkup(
      <ReferenceList>
        <p>Not a table.</p>
      </ReferenceList>,
    );
    expect(html).toBe('<p>Not a table.</p>');
  });
});
