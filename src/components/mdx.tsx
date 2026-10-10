import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import type { MDXComponents } from 'mdx/types';
import { AccessTree } from './diagrams/access-tree';
import { ApiMap } from './diagrams/api-map';
import { ChangeFlow } from './diagrams/change-flow';
import { ConnectorMap } from './diagrams/connector-map';
import { DeviceMap } from './diagrams/device-map';
import { FileMap } from './diagrams/file-map';
import { InstanceMap } from './diagrams/instance-map';
import { ItemLifecycle } from './diagrams/item-lifecycle';
import { ItemLayers } from './diagrams/item-layers';
import { TypeTree } from './diagrams/type-tree';
import { ReferenceList } from './reference-list';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    AccessTree,
    ApiMap,
    ChangeFlow,
    ConnectorMap,
    DeviceMap,
    File,
    FileMap,
    Files,
    Folder,
    InstanceMap,
    ItemLifecycle,
    ItemLayers,
    ReferenceList,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    TypeTree,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
