import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { File, Files as BaseFiles, Folder } from 'fumadocs-ui/components/files';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { ApiMap } from './api-map';
import { Callout } from './callout';
import { Changelog } from './changelog';
import { Card, Cards } from './cards';
import { FoldingCodeBlock, Terminal } from './code';
import { CodeBlockTabs } from './code-tabs';
import { ReferenceList } from './reference-list';
import { Step, Steps } from './steps';
import { visualComponents } from './visuals';

// Fumadocs draws a file tree with a control's corner; this gives it the
// container corner and spacing that Cards, Callout and paged steps use.
function Files({ className, ...props }: ComponentProps<typeof BaseFiles>) {
  return <BaseFiles className={cn('my-6 rounded-xl', className)} {...props} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ApiMap,
    Callout,
    Card,
    Changelog,
    CodeBlockTabs,
    Cards,
    Accordion,
    Accordions,
    File,
    Files,
    Folder,
    ReferenceList,
    Step,
    Steps,
    Tab,
    Tabs,
    Terminal,
    pre: FoldingCodeBlock,
    TypeTable,
    ...visualComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
