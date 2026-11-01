/**
 * The API map on /api-reference: every operation in the API description,
 * grouped by tag and the tags gathered into a few areas. The component draws
 * it and `source.config.ts` writes the same map into the page's Markdown copy,
 * so both come from `openapi.json` and neither is written by hand.
 *
 * This module imports no JSON and nothing from `@/`, because `source.config.ts`
 * loads it outside Vite: callers pass the description and the areas in.
 */

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;

type Operation = { operationId?: string; summary?: string; tags?: string[] };
type PathItem = Partial<Record<(typeof HTTP_METHODS)[number], Operation>>;

export type Spec = {
  tags?: { name: string; description?: string; 'x-operation-order'?: string[] }[];
  paths?: Record<string, PathItem>;
  webhooks?: Record<string, PathItem>;
};

export type Areas = { areas: { name: string; tags: string[] }[] };

export type MapOperation = {
  /** `GET`, `POST` and so on, or `WEBHOOK` for a request Marfa sends. */
  method: string;
  /** The path, or the webhook's name for a webhook, which has none. */
  path: string;
  title: string;
  href: string;
  webhook: boolean;
};

export type MapGroup = { name: string; description: string; href: string; operations: MapOperation[] };
export type MapArea = { name: string; groups: MapGroup[]; count: number };

/** A tag's folder in the reference, as fumadocs-openapi names it: lowercase, hyphens for spaces. */
export const tagSlug = (name: string) => name.replace(/\s+/g, '-').toLowerCase();

/** The address of an operation's page. */
export const operationHref = (tag: string, operationId: string) => `/api-reference/${tagSlug(tag)}/${operationId}`;

/** Every operation in the description, paths first and then webhooks, with the tag it is filed under. */
function operations(spec: Spec): (MapOperation & { tag: string; id: string })[] {
  const found: (MapOperation & { tag: string; id: string })[] = [];
  const read = (entries: Record<string, PathItem> | undefined, webhook: boolean) => {
    for (const [path, item] of Object.entries(entries ?? {})) {
      for (const method of HTTP_METHODS) {
        const operation = item[method];
        const tag = operation?.tags?.[0];
        if (!operation?.operationId || !tag) continue;
        found.push({
          tag,
          id: operation.operationId,
          method: webhook ? 'WEBHOOK' : method.toUpperCase(),
          path,
          title: operation.summary ?? operation.operationId,
          href: operationHref(tag, operation.operationId),
          webhook,
        });
      }
    }
  };
  read(spec.paths, false);
  read(spec.webhooks, true);
  return found;
}

/** The tags of the description that no area holds, and the area tags it doesn't have. */
export function unmappedTags(spec: Spec, areas: Areas): { missing: string[]; unknown: string[]; repeated: string[] } {
  const declared = new Set([...(spec.tags ?? []).map((tag) => tag.name), ...operations(spec).map((op) => op.tag)]);
  const placed = areas.areas.flatMap((area) => area.tags);
  return {
    missing: [...declared].filter((tag) => !placed.includes(tag)),
    unknown: placed.filter((tag) => !declared.has(tag)),
    repeated: placed.filter((tag, index) => placed.indexOf(tag) !== index),
  };
}

/**
 * The map: each area in the order `areas` lists it, its groups in that order,
 * and each group's operations in its tag's `x-operation-order`. An operation
 * the order leaves out goes last, as it does in the sidebar.
 */
export function buildApiMap(spec: Spec, areas: Areas): MapArea[] {
  const all = operations(spec);
  const tags = new Map((spec.tags ?? []).map((tag) => [tag.name, tag]));
  return areas.areas.map((area) => {
    const groups = area.tags.map((name): MapGroup => {
      const order = tags.get(name)?.['x-operation-order'] ?? [];
      const rank = (id: string) => {
        const at = order.indexOf(id);
        return at === -1 ? Number.MAX_SAFE_INTEGER : at;
      };
      const ops = all.filter((op) => op.tag === name).sort((a, b) => rank(a.id) - rank(b.id));
      return {
        name,
        description: tags.get(name)?.description ?? '',
        href: ops[0]?.href ?? '/api-reference',
        operations: ops.map(({ method, path, title, href, webhook }) => ({ method, path, title, href, webhook })),
      };
    });
    return { name: area.name, groups, count: groups.reduce((sum, group) => sum + group.operations.length, 0) };
  });
}

const plural = (count: number) => `${count} ${count === 1 ? 'operation' : 'operations'}`;

/** Link text with backslashes and any bracket that would end it escaped. */
const linkText = (text: string) => text.replace(/[\\[\]]/g, '\\$&');

/**
 * The map as the Markdown copy writes it: an area in bold, then each group with
 * its description, and under it each operation's method and path linked to its
 * page. Agents read this copy, so it holds every operation the page draws.
 */
export function apiMapMarkdown(map: MapArea[]): string {
  return map
    .map((area) => {
      const groups = area.groups.map((group) => {
        const lead = `- **${group.name}** (${plural(group.operations.length)})${group.description ? `: ${group.description}` : ''}`;
        const rows = group.operations.map(
          (op) => `  - \`${op.method} ${op.path}\`: [${linkText(op.title)}](${op.href})`,
        );
        return [lead, ...rows].join('\n');
      });
      return [`**${area.name}** (${plural(area.count)})`, groups.join('\n')].join('\n\n');
    })
    .join('\n\n');
}
