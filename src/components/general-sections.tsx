import { Markdown } from 'fumadocs-core/content/md';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import spec from '../../openapi.json';

// The rules every operation relies on, as the API description itself states
// them in `info.description`, so this page never drifts from the document.
export function GeneralSections() {
  return <Markdown components={defaultMdxComponents}>{spec.info.description}</Markdown>;
}
