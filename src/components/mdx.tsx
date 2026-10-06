import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { InstanceMap } from './diagrams/instance-map';
import { GeneralSections } from './general-sections';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    GeneralSections,
    InstanceMap,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
