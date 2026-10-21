import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';
import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';

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
  filterElement(node) {
    if (!isJsx(node) || !node.name) return true;
    if (WRAPPERS.has(node.name)) return 'children-only';
    if (REWRITTEN.has(node.name)) return true;
    return false;
  },
  stringify(node, _parent, state, info) {
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
        const title = attribute(node, 'title');
        const body = `${title ? `**${title}.** ` : ''}${inner()}`;
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
    // under the description and the Markdown copy under the title.
    schema: pageSchema.extend({ identifier: z.string().optional() }),
    postprocess: {
      includeProcessedMarkdown: llms,
    },
  },
});

// Shiki loads a language the first time a block uses it, and Markdown colours
// its frontmatter with YAML only when YAML is already loaded. The server and
// the browser compile pages in different orders, so a Markdown block could be
// coloured differently on each and fail hydration. Loading both up front gives
// every build the same highlighting.
export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: { langs: ['yaml', 'markdown'] },
  },
});
