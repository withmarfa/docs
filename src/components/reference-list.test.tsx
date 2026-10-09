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

  it('leaves its children alone when they hold no table with rows', () => {
    const html = renderToStaticMarkup(
      <ReferenceList>
        <p>Not a table.</p>
      </ReferenceList>,
    );
    expect(html).toBe('<p>Not a table.</p>');
  });
});
