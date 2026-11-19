import Link from 'fumadocs-core/link';
import { Check, Copy } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useComponents, useRenderContext, useTypeScriptDefinitions } from 'fumadocs-openapi';
import { type OperationResponse, type ResponseTab, useOperation } from 'fumadocs-openapi/operation';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TabsContent as CardTabsContent, TabsList, TabsTrigger } from 'fumadocs-ui/components/tabs';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';
import { Tabs, TabsContent } from 'fumadocs-ui/components/ui/tabs';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';
import { cn } from '@/lib/cn';
import { statusLabel } from '@/lib/http-status';
import { ERRORS_PAGE, isErrorCode, splitResponseCodes } from '@/lib/response-codes';

// An operation's response codes as two controls: a tab for each success code
// and one select, "Errors", for every error code, with a link to the Errors
// page. fumadocs-openapi draws a row of one tab for each code instead, which
// is fifteen tabs on the widest operation. Two places show the codes, and each
// goes through a route the package documents:
//
// - The example responses beside the request: `content.renderResponseTabs`
//   (`ResponseExamples`).
// - The "Response body" section: the page sets `showResponseSchema: false`, so
//   the package draws none, and `content.renderOperationLayout` puts
//   `ResponseBody` where the section went. It reads the operation through the
//   headless `useOperation()` of `fumadocs-openapi/operation` and draws each
//   schema with the page's own `SchemaUI`, `Markdown` and `Heading`
//   (`useComponents()`), as the package's "Headless" page describes.
//
// A select is a native control, so the keyboard reaches it with nothing added.
// A chosen error code shows in the select and picks that code's panel.

type Pick = { value: string; onValueChange: (code: string) => void };

function ErrorsSelect({ errors, value, onValueChange }: Pick & { errors: string[] }) {
  const chosen = isErrorCode(value);
  return (
    <span className="ms-auto inline-flex shrink-0 items-center gap-2 not-prose text-xs">
      <select
        aria-label="Errors"
        value={chosen ? value : ''}
        onChange={(event) => event.target.value && onValueChange(event.target.value)}
        className={cn(
          'h-7 max-w-44 cursor-pointer rounded-md border bg-fd-background px-2 font-mono text-xs text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground',
          chosen && 'border-fd-primary text-fd-foreground',
        )}
      >
        <option value="" disabled hidden>
          Errors
        </option>
        {errors.map((code) => (
          <option key={code} value={code}>
            {statusLabel(code)}
          </option>
        ))}
      </select>
      <Link href={ERRORS_PAGE} className="whitespace-nowrap text-fd-muted-foreground underline underline-offset-2 hover:text-fd-accent-foreground">
        About errors
      </Link>
    </span>
  );
}

/** The content of a `TabsList`: a trigger for each success code and the Errors select. */
function CodeTriggers({ codes, value, onValueChange }: Pick & { codes: string[] }) {
  const { success, errors } = splitResponseCodes(codes);
  return (
    <>
      {success.map((code) => (
        <TabsTrigger key={code} value={code}>
          {code}
        </TabsTrigger>
      ))}
      {errors.length > 0 && <ErrorsSelect errors={errors} value={value} onValueChange={onValueChange} />}
    </>
  );
}

/** The example responses beside the request, as `content.renderResponseTabs` draws them. */
export function ResponseExamples({ tabs }: { tabs: ResponseTab[] }) {
  const { Markdown, CodeBlock } = useComponents();
  const [value, setValue] = useState(tabs[0].code);

  const renderExample = (example: NonNullable<ResponseTab['examples']>[number]) => (
    <>
      {example.description && <Markdown md={example.description} />}
      <CodeBlock lang="json" code={JSON.stringify(example.sample, null, 2)} />
    </>
  );

  return (
    <Tabs value={value} onValueChange={setValue} className="my-4 flex flex-col overflow-hidden rounded-xl border bg-fd-secondary">
      <TabsList>
        <CodeTriggers codes={tabs.map((tab) => tab.code)} value={value} onValueChange={setValue} />
      </TabsList>
      {tabs.map(({ code, examples = [] }) => (
        <CardTabsContent key={code} value={code}>
          {examples.length > 1 ? (
            <Accordions type="single" className="pt-2" defaultValue="0">
              {examples.map((example, index) => (
                <Accordion key={index} value={String(index)} title={example.label}>
                  {renderExample(example)}
                </Accordion>
              ))}
            </Accordions>
          ) : examples.length === 1 ? (
            renderExample(examples[0])
          ) : (
            'Empty'
          )}
        </CardTabsContent>
      ))}
    </Tabs>
  );
}

/** An anchor segment, as the package makes one: lowercase, spaces to hyphens, other punctuation dropped. */
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s/g, '-');

/** The anchor of a response's schema, which the properties inside it extend. */
const anchorOf = (code: string, mediaType: string) => `response.${slug(code)}.${slug(mediaType)}`;

function currentHash() {
  const hash = window.location.hash.slice(1);
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

/** Calls `onLink` on load and on each hash change that links into `anchor`, so a link to a property shows its panel. */
function useAnchorLink(anchor: string, onLink: () => void) {
  useEffect(() => {
    const check = () => {
      const hash = currentHash();
      if (hash === anchor || hash.startsWith(`${anchor}.`)) onLink();
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
    // The link handler only sets state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);
}

function CopyTypeScript({ code }: { code: string }) {
  const [copied, onCopy] = useCopyButton(() => navigator.clipboard.writeText(code));
  return (
    <button
      type="button"
      title="Use the response body type in TypeScript."
      onClick={onCopy}
      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-my-1 shrink-0 gap-1.5 text-fd-muted-foreground [&_svg]:size-3.5')}
    >
      {copied ? <Check /> : <Copy />}
      TypeScript
    </button>
  );
}

/** Names the media type of a response, and picks one when it has several. */
function MediaTypeSelector({ items, value, onValueChange }: { items: string[]; value: string; onValueChange: (mediaType: string) => void }) {
  if (items.length === 1) return <code className="min-w-0 px-1.5 font-medium">{items[0]}</code>;
  return (
    <select
      aria-label="Media type"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      className="h-7 max-w-full cursor-pointer rounded-md bg-transparent px-1.5 font-mono text-[0.8125rem] font-medium hover:bg-fd-accent hover:text-fd-accent-foreground"
    >
      {items.map((mediaType) => (
        <option key={mediaType} value={mediaType}>
          {mediaType}
        </option>
      ))}
    </select>
  );
}

/** The schema of one response in one media type. */
function MediaSchema({ code, mediaType, media, selector }: { code: string; mediaType: string; media: OperationResponse['content'][string]; selector: ReactNode }) {
  const { SchemaUI, Markdown, CodeBlock } = useComponents();
  const { schemaUI } = useRenderContext();
  const types = useTypeScriptDefinitions(media.schema as never, { name: 'ResponseBody', readOnly: true, writeOnly: false });
  if (!media.schema) {
    return <div className="not-prose flex h-9 items-center rounded-xl border bg-fd-card ps-1.5 pe-1 text-[0.8125rem]">{selector}</div>;
  }
  return (
    <SchemaUI
      root={media.schema as never}
      readOnly
      showExample={schemaUI?.showExample}
      renderMarkdown={(md) => <Markdown md={md} />}
      renderCodeblock={(props) => <CodeBlock {...props} />}
      client={{
        rootId: `${anchorOf(code, mediaType)}.response`,
        name: 'response',
        as: 'body',
        selector,
        actions: types && <CopyTypeScript code={types} />,
      }}
    />
  );
}

function ResponsePanel({ item, onLink }: { item: OperationResponse; onLink: () => void }) {
  const { Markdown } = useComponents();
  const mediaTypes = Object.keys(item.content);
  const [mediaType, setMediaType] = useState(mediaTypes[0]);
  useAnchorLink(`response.${slug(item.status)}`, onLink);

  return (
    <>
      {item.response.description && (
        <div className="mb-3 prose-no-margin text-fd-muted-foreground">
          <Markdown md={item.response.description} />
        </div>
      )}
      {mediaTypes.map((name) => (
        <div key={name} hidden={name !== mediaType}>
          <MediaPanel code={item.status} mediaType={name} media={item.content[name]} mediaTypes={mediaTypes} selected={mediaType} onSelect={setMediaType} />
        </div>
      ))}
    </>
  );
}

function MediaPanel({ code, mediaType, media, mediaTypes, selected, onSelect }: { code: string; mediaType: string; media: OperationResponse['content'][string]; mediaTypes: string[]; selected: string; onSelect: (mediaType: string) => void }) {
  useAnchorLink(anchorOf(code, mediaType), () => onSelect(mediaType));
  return <MediaSchema code={code} mediaType={mediaType} media={media} selector={<MediaTypeSelector items={mediaTypes} value={selected} onValueChange={onSelect} />} />;
}

/** The "Response body" section: success codes as tabs, every error code in one select. */
export function ResponseBody({ headingLevel = 2 }: { headingLevel?: number }) {
  const { Heading } = useComponents();
  const { responses } = useOperation();
  const [selected, setSelected] = useState(responses[0]?.status);
  if (responses.length === 0) return null;

  return (
    <Tabs value={selected} onValueChange={setSelected} className="mt-10 first:mt-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Heading id="response-body" depth={headingLevel} className="my-0! me-auto">
          Response body
        </Heading>
        <TabsList className="max-w-full px-0">
          <CodeTriggers codes={responses.map((item) => item.status)} value={selected} onValueChange={setSelected} />
        </TabsList>
      </div>
      {responses.map((item) => (
        <TabsContent key={item.status} value={item.status} forceMount className="data-[state=inactive]:hidden">
          <ResponsePanel item={item} onLink={() => setSelected(item.status)} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
