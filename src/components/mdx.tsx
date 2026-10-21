import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn';
import { Callout } from './callout';
import { Card, Cards } from './cards';
import { ReferenceList } from './reference-list';
import { visualComponents } from './visuals';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    // Long lines wrap rather than scroll: Fumadocs sizes the code to its
    // longest line (`w-max`), which no wrapping rule can undo from outside.
    pre: (props: ComponentProps<'pre'>) => (
      <CodeBlock {...props}>
        <Pre className="w-full">{props.children}</Pre>
      </CodeBlock>
    ),
    Callout,
    Card,
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
    TypeTable,
    ...visualComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
