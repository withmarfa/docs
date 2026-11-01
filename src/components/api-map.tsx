import Link from 'fumadocs-core/link';
import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import spec from '../../openapi.json';
import areas from '@/lib/api-map-areas.json';
import { buildApiMap, type MapArea, type Spec } from '@/lib/api-map';
import { ApiMethod, parseApiMethod } from './api-method';

/** A tag's description, with its code spans drawn as code. */
function Description({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : part))}
    </>
  );
}

/** A path that may break after each slash, with its parameters quieter than the fixed segments. */
function Path({ path }: { path: string }) {
  const parts: ReactNode[] = [];
  path.split('/').forEach((segment, index) => {
    if (index > 0) parts.push(<Fragment key={`s${index}`}>/<wbr /></Fragment>);
    if (!segment) return;
    parts.push(
      /^\{.+\}$/.test(segment) ? (
        <span key={index} className="marfa-apimap-param">
          {segment}
        </span>
      ) : (
        segment
      ),
    );
  });
  return <code className="marfa-apimap-path">{parts}</code>;
}

/**
 * Every operation of the HTTP API on one figure: an area for each part of
 * Marfa, a group for each tag, and a row for each operation that opens its
 * page. A group opens on a press to show its rows, and the server render holds
 * every row, so the links are there without script.
 */
export function ApiMapView({ map }: { map: MapArea[] }) {
  const total = map.reduce((sum, area) => sum + area.count, 0);
  return (
    <figure className="marfa-apimap not-prose" aria-label={`The HTTP API: ${total} operations in ${map.length} areas`}>
      {map.map((area) => (
        <section key={area.name} className="marfa-apimap-area" aria-label={area.name}>
          <div className="marfa-apimap-area-head">
            <span className="marfa-apimap-area-name">{area.name}</span>
            <span className="marfa-apimap-count">{area.count}</span>
          </div>
          <div className="marfa-apimap-groups">
            {area.groups.map((group) => (
              <details key={group.name} className="marfa-apimap-group">
                <summary>
                  <ChevronRight className="marfa-apimap-chevron" aria-hidden="true" />
                  <span className="marfa-apimap-group-name">{group.name}</span>
                  <span className="marfa-apimap-count">{group.operations.length}</span>
                </summary>
                <div className="marfa-apimap-panel">
                  {group.description ? (
                    <p className="marfa-apimap-description">
                      <Description text={group.description} />
                    </p>
                  ) : null}
                  <ul className="marfa-apimap-rows">
                    {group.operations.map((op) => {
                      const method = parseApiMethod(op.method);
                      return (
                        <li key={op.href}>
                          <Link href={op.href} className="marfa-apimap-row" title={op.title}>
                            {method ? <ApiMethod method={method} /> : null}
                            {op.webhook ? (
                              <span className="marfa-apimap-webhook">{op.title}</span>
                            ) : (
                              <Path path={op.path} />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </figure>
  );
}

/** The map of the API description this build carries. */
export function ApiMap() {
  return <ApiMapView map={buildApiMap(spec as Spec, areas)} />;
}
