import { createFileRoute } from '@tanstack/react-router';
import type * as PageTree from 'fumadocs-core/page-tree';
import { source } from '@/lib/source';

/**
 * Hand-built hierarchical index of the docs (Anthropic claude_code_docs_map.md
 * pattern). Top-level sections become H1; sub-groups become H2; pages become
 * Markdown links.
 *
 * Emitted at `/docs-map.md` for agent consumers that want one fetch with the
 * full page taxonomy and per-page URLs.
 */
export const Route = createFileRoute('/docs-map.md')({
  server: {
    handlers: {
      GET: () => {
        const pages = source.getPages();

        // Group pages by URL segment depth.
        //   /                    → site root, becomes title
        //   /<section>           → H1 section
        //   /<section>/<sub>     → H2 sub-group (if multiple) else page
        //   /<section>/<sub>/<page>  → page under H2
        type Grouped = Record<string, Record<string, typeof pages>>;
        const grouped: Grouped = {};
        let root: (typeof pages)[number] | undefined;

        for (const page of pages) {
          const segs = page.slugs;
          if (segs.length === 0) {
            root = page;
            continue;
          }

          const section = segs[0];
          const sub = segs.length >= 3 ? segs[1] : '';
          grouped[section] ??= {};
          grouped[section][sub] ??= [];
          grouped[section][sub].push(page);
        }

        const lines: string[] = [];
        lines.push('# Marfa documentation map');
        lines.push('');
        if (root) {
          lines.push(
            `Hierarchical index of every page on docs.marfa.so. Each link resolves to the human-readable HTML page; append \`.md\` for the markdown twin (e.g. \`/get-started/items-and-types.md\`).`,
          );
          lines.push('');
          lines.push(`- [${root.data.title}](${root.url})`);
          lines.push('');
        }

        const titles = sectionTitles(source.getPageTree());

        // Stable section order, the same as content/docs/meta.json.
        const sectionOrder = ['get-started', 'guides', 'tools', 'api-reference'];
        const sortedSections = [
          ...sectionOrder.filter((s) => s in grouped),
          ...Object.keys(grouped).filter((s) => !sectionOrder.includes(s)),
        ];

        for (const section of sortedSections) {
          const sectionTitle = titles.get(section) ?? humanize(section);
          lines.push(`## ${sectionTitle}`);
          lines.push('');

          const subs = grouped[section];
          const subKeys = Object.keys(subs).sort((a, b) => {
            // '' (top-level pages in this section) come first
            if (a === '') return -1;
            if (b === '') return 1;
            return a.localeCompare(b);
          });

          for (const sub of subKeys) {
            if (sub !== '') {
              lines.push(`### ${humanize(sub)}`);
              lines.push('');
            }
            for (const page of subs[sub]) {
              lines.push(`- [${page.data.title}](${page.url})${page.data.description ? ` — ${page.data.description}` : ''}`);
            }
            lines.push('');
          }
        }

        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/markdown' },
        });
      },
    },
  },
});

function humanize(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function firstUrl(node: PageTree.Node): string | undefined {
  if (node.type === 'page') return node.url;
  if (node.type !== 'folder') return undefined;
  if (node.index) return node.index.url;
  for (const child of node.children) {
    const url = firstUrl(child);
    if (url) return url;
  }
  return undefined;
}

// Each tab's title, as its meta.json gives it, keyed by the first URL segment
// its pages share. A folder slug does not say "Get started" or "API reference".
function sectionTitles(tree: PageTree.Root): Map<string, string> {
  const titles = new Map<string, string>();
  for (const node of tree.children) {
    if (node.type !== 'folder' || typeof node.name !== 'string') continue;
    const segment = firstUrl(node)?.split('/')[1];
    if (segment) titles.set(segment, node.name);
  }
  return titles;
}
