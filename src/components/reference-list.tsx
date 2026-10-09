import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';

type WithChildren = ReactElement<{ children?: ReactNode }>;

function elements(node: ReactNode): WithChildren[] {
  return Children.toArray(node).filter((child): child is WithChildren => isValidElement(child));
}

/** Every row of the first table under `node`, as the contents of its cells. */
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

/**
 * A Markdown table drawn as a list of entries: the first column is each
 * entry's name, `description` names the column shown under it, and every
 * other column is a labeled detail beside the name.
 *
 * The page source keeps the plain table, so the page's Markdown copy and the
 * docs tools carry a table an agent reads as one. Only the HTML changes, for
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
  const [header, ...entries] = tableRows(children);
  if (!header || entries.length === 0) return <>{children}</>;

  const details = header.map((_, index) => index).filter((index) => index !== 0 && index !== description);

  return (
    <dl className="marfa-ref">
      {entries.map((cells, row) => (
        <div key={row} className="marfa-ref-entry">
          <dt className="marfa-ref-name">{cells[0]}</dt>
          {details.map((index) => (
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
