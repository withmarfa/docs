import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react';

type WithChildren = ReactElement<{ children?: ReactNode }>;

function elements(node: ReactNode): WithChildren[] {
  return Children.toArray(node).filter((child): child is WithChildren => isValidElement(child));
}

// A blank cell, or one that reads "None", such as a setting with no default,
// gets no label: the Markdown copy keeps the word, the list leaves it out.
function isEmpty(cell: ReactNode): boolean {
  return Children.toArray(cell).every(
    (child) => typeof child === 'string' && (child.trim() === '' || child.trim() === 'None'),
  );
}

/** Every table row under `node`, in order, as the contents of its cells. A second table's rows, its header included, follow the first's. */
export function tableRows(node: ReactNode): ReactNode[][] {
  const rows: ReactNode[][] = [];
  for (const element of elements(node)) {
    if (element.type === 'tr') {
      rows.push(elements(element.props.children).map((cell) => cell.props.children));
    } else {
      rows.push(...tableRows(element.props.children));
    }
  }
  return rows;
}

// The blocks a page puts under the list, with an included file's fragment
// opened, so its headings and tables are blocks of their own.
function blocks(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment ? blocks(child.props.children) : [child],
  );
}

function Entries({ rows, description }: { rows: ReactNode[][]; description: number }) {
  const [header, ...entries] = rows;
  const details = header.map((_, index) => index).filter((index) => index !== 0 && index !== description);

  return (
    <dl className="marfa-ref">
      {entries.map((cells, row) => (
        <div key={row} className="marfa-ref-entry">
          <dt className="marfa-ref-name">{cells[0]}</dt>
          {details
            .filter((index) => !isEmpty(cells[index]))
            .map((index) => (
              <dd key={index} className="marfa-ref-detail">
                <span className="marfa-ref-label">{header[index]}</span> {cells[index]}
              </dd>
            ))}
          <dd className="marfa-ref-description">{cells[description]}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Markdown tables drawn as lists of entries: the first column is each entry's
 * name, `description` names the column shown under it, and every other column
 * is a labeled detail beside the name. Each table under it becomes its own
 * list, and anything else, such as the heading over a table, stays as it is.
 *
 * The page source keeps the plain tables, so the page's Markdown copy and the
 * docs tools carry tables an agent reads as such. Only the HTML changes, for
 * a catalogue whose names are long and whose rows hold a sentence each.
 */
export function ReferenceList({
  children,
  description = 1,
}: {
  children: ReactNode;
  /** The column, counted from 0, that holds each entry's description. */
  description?: number;
}) {
  return (
    <>
      {blocks(children).map((block, index) => {
        const rows = tableRows(block);
        if (rows.length < 2) return <Fragment key={index}>{block}</Fragment>;
        return <Entries key={index} rows={rows} description={description} />;
      })}
    </>
  );
}
