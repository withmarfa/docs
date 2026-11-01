import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { parseCodeBlockAttributes, rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { pageSchema } from 'fumadocs-core/source/schema';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import { gfmTableToMarkdown } from 'mdast-util-gfm-table';
import { apiMapMarkdown, buildApiMap, type Areas, type Spec } from './src/lib/api-map';
import { changelogMarkdown, remarkChangelogIndex, type Release } from './src/lib/changelog';
import { statusLabel } from './src/lib/http-status';
import { sseLanguage } from './src/lib/sse-language';
import { rehypeTableLabels } from './src/lib/table-labels';

/** The releases the Changelog page draws, from the file `scripts/sync-changelog.ts` writes. */
function readReleases(): Release[] {
  return JSON.parse(readFileSync('src/generated/changelog.json', 'utf8'));
}

/** The API map that the API reference's overview draws, from the API description and its areas. */
function readApiMap() {
  const spec: Spec = JSON.parse(readFileSync('openapi.json', 'utf8'));
  const areas: Areas = JSON.parse(readFileSync('src/lib/api-map-areas.json', 'utf8'));
  return buildApiMap(spec, areas);
}

/** The part of an MDX JSX node this file reads (mdast-util-mdx's shape). */
type JsxElement = {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name: string | null;
  attributes: { type: string; name?: string; value?: unknown }[];
  children: { type: string }[];
};

/** Components that only arrange their content: the Markdown copy keeps the content. */
const WRAPPERS = new Set(['Tabs', 'CodeBlockTabs', 'Steps', 'Step', 'Accordions', 'Cards', 'ReferenceList']);

/** Components the Markdown copy writes in a Markdown form of its own. */
const REWRITTEN = new Set([
  'Tab',
  'CodeBlockTab',
  'Accordion',
  'Card',
  'Callout',
  'Sequence',
  'Files',
  'Folder',
  'File',
  'Terminal',
  'Changelog',
  'ApiMap',
]);

/** Node types that start a block, as opposed to text within one. */
const FLOW = new Set([
  'paragraph',
  'heading',
  'code',
  'list',
  'table',
  'blockquote',
  'thematicBreak',
  'html',
  'mdxJsxFlowElement',
  'mdxFlowExpression',
]);

function isJsx(node: { type: string }): node is JsxElement {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

function attribute(node: JsxElement, name: string): string | undefined {
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxAttribute' && attr.name === name && typeof attr.value === 'string') {
      return attr.value;
    }
  }
  return undefined;
}

/** A `Files` tree as indented lines, folders ending in a slash. */
function fileTree(node: JsxElement, depth = 0): string[] {
  const lines: string[] = [];
  for (const child of node.children) {
    if (!isJsx(child)) continue;
    const name = attribute(child, 'name');
    if (child.name === 'Folder' && name) {
      lines.push(`${'  '.repeat(depth)}${name}/`);
      lines.push(...fileTree(child, depth + 1));
    } else if (child.name === 'File' && name) {
      lines.push(`${'  '.repeat(depth)}${name}`);
    } else {
      lines.push(...fileTree(child, depth));
    }
  }
  return lines;
}

/**
 * The Markdown copy of each page, which agents read at `<page>.md`, through the
 * docs MCP server and in `llms-full.txt`. Layout components give way to their
 * content, a few become plain Markdown, and the visuals are left out: a page's
 * prose carries every fact a visual shows.
 */
const llms: LLMsOptions = {
  // Tables without column alignment: padding each cell to its column's width
  // would make the copies, and so llms-full.txt, about a fifth spaces and
  // dashes. A later extension's handlers replace remark-gfm's.
  extensions: [gfmTableToMarkdown({ tablePipeAlign: false })],
  filterElement(node) {
    if (!isJsx(node) || !node.name) return true;
    if (WRAPPERS.has(node.name)) return 'children-only';
    if (REWRITTEN.has(node.name)) return true;
    return false;
  },
  stringify(node, parent, state, info) {
    // A fenced block with a note or a status chip in its header: the header's
    // words come first, so an agent loses nothing the page shows.
    if (node.type === 'code') {
      const code = node as unknown as { meta?: string | null };
      const { rest, attributes } = parseCodeBlockAttributes(code.meta ?? '', ['title', 'note', 'status']);
      const extra =
        typeof attributes.note === 'string'
          ? attributes.note
          : attributes.status != null
            ? statusLabel(String(attributes.status))
            : undefined;
      if (extra === undefined) return undefined;
      const label = typeof attributes.title === 'string' ? `${attributes.title} (${extra})` : extra;
      const fence = state.handle({ ...node, meta: rest.trim() || null } as never, parent as never, state, info);
      return `${label}:\n\n${fence}`;
    }
    if (!isJsx(node) || !node.name || !REWRITTEN.has(node.name)) return undefined;
    // A component written on one line holds phrasing, not paragraphs, and
    // writing that as flow would break the text at each inline element.
    const inline = node.children.every((child) => !FLOW.has(child.type));
    const inner = () =>
      (inline
        ? state.containerPhrasing({ type: 'paragraph', children: node.children } as never, info)
        : state.containerFlow(node as never, info)
      ).trim();
    switch (node.name) {
      case 'Tab':
      case 'CodeBlockTab':
        return `**${attribute(node, 'value') ?? ''}**\n\n${inner()}`;
      case 'Accordion':
        return `**${attribute(node, 'title') ?? ''}**\n\n${inner()}`;
      case 'Sequence':
        return `**${attribute(node, 'title') ?? ''}**\n\n${inner()}`;
      case 'Card': {
        const text = inner().replace(/\s+/g, ' ');
        return `- [${attribute(node, 'title') ?? ''}](${attribute(node, 'href') ?? ''})${text ? `: ${text}` : ''}`;
      }
      case 'Callout': {
        const body = `**${attribute(node, 'title') ?? ''}.** ${inner()}`;
        return body
          .split('\n')
          .map((line) => (line ? `> ${line}` : '>'))
          .join('\n');
      }
      case 'Terminal': {
        // The command, then what it prints, labelled so an agent doesn't take the output for more commands.
        const [command, ...output] = node.children.filter((child) => child.type === 'code');
        const flow = (children: { type: string }[]) =>
          state.containerFlow({ type: 'root', children } as never, info).trim();
        return output.length ? `${flow([command])}\n\nOutput:\n\n${flow(output)}` : flow([command]);
      }
      case 'Changelog': {
        // The component draws releases from a data file, so the copy writes the same releases as Markdown.
        return changelogMarkdown(readReleases());
      }
      case 'ApiMap':
        // Drawn from the API description, so the copy writes every operation and its link.
        return apiMapMarkdown(readApiMap());
      case 'Files':
        return ['```text', ...fileTree(node), '```'].join('\n');
      default:
        return inner();
    }
  },
};

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // A Catalog type page names its type's identifier, which the header shows
    // under the description and the Markdown copy under the title. `headTitle`
    // names a page in browser tabs and search results (`src/lib/page-head.ts`).
    schema: pageSchema.extend({ identifier: z.string().optional(), headTitle: z.string().optional() }),
    postprocess: {
      includeProcessedMarkdown: llms,
    },
  },
});

// Shiki loads a language the first time a block uses it, and Markdown colours
// its frontmatter with YAML only when YAML is already loaded. The server and
// the browser compile pages in different orders, so a Markdown block could be
// coloured differently on each and fail hydration. Loading them up front gives
// every build the same highlighting. JSON is listed because the `sse` grammar
// embeds it for a `data:` line, and Shiki needs an embedded language loaded.
//
// A fenced block's header takes `title="Response"` as its label, and two more
// attributes beside Copy: `note="Server-sent events"`, a lighter note, and
// `status="200"`, a chip that reads "200 OK". Fumadocs only reads the names it
// knows, so these two are read here and handed on as props of the block.
export default defineConfig({
  mdxOptions: {
    // Before Fumadocs's structure step, which builds the search index: the Changelog page's releases are
    // data the component draws, so the index would otherwise hold none of their notes.
    remarkPlugins: [remarkChangelogIndex(readReleases)],
    rehypePlugins: (plugins) => [...plugins, rehypeTableLabels],
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      langs: ['yaml', 'markdown', 'json', sseLanguage as never],
      parseMetaString(meta, node, tree) {
        const header = parseCodeBlockAttributes(meta, ['note', 'status']);
        return { ...rehypeCodeDefaultOptions.parseMetaString?.(header.rest, node, tree), ...header.attributes };
      },
    },
  },
});
