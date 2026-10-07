import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ApiMap } from './diagrams/api-map';
import { InstanceMap } from './diagrams/instance-map';
import { ItemLayers } from './diagrams/item-layers';
import { TypeTree } from './diagrams/type-tree';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ApiMap,
    InstanceMap,
    ItemLayers,
    TypeTree,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
