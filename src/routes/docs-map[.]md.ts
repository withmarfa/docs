import { createFileRoute } from '@tanstack/react-router';
import { source } from '@/lib/source';
import { docsRoute } from '@/lib/shared';

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
        //   /docs                 → site root, becomes title
        //   /docs/<section>       → H1 section
        //   /docs/<section>/<sub> → H2 sub-group (if multiple) else page
        //   /docs/<section>/<sub>/<page>  → page under H2
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
            `Hierarchical index of every page on docs.marfa.so. Each link resolves to the human-readable HTML page; append \`.md\` for the markdown twin (e.g. \`${docsRoute}/concepts/data-primitives/items.md\`).`,
          );
          lines.push('');
          lines.push(`- [${root.data.title}](${root.url})`);
          lines.push('');
        }

        // Stable section order — reuse what's in content/docs/meta.json
        const sectionOrder = ['get-started', 'concepts', 'api', 'sdks-and-clients', 'self-hosting'];
        const sortedSections = [
          ...sectionOrder.filter((s) => s in grouped),
          ...Object.keys(grouped).filter((s) => !sectionOrder.includes(s)),
        ];

        for (const section of sortedSections) {
          const sectionTitle = humanize(section);
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
