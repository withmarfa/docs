import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { ApiMap } from './diagrams/api-map';
import { FileMap } from './diagrams/file-map';
import { InstanceMap } from './diagrams/instance-map';
import { ItemLifecycle } from './diagrams/item-lifecycle';
import { ItemLayers } from './diagrams/item-layers';
import { TypeTree } from './diagrams/type-tree';
import { ReferenceList } from './reference-list';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ApiMap,
    FileMap,
    InstanceMap,
    ItemLifecycle,
    ItemLayers,
    ReferenceList,
    TypeTree,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
