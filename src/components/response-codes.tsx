import Link from 'fumadocs-core/link';
import type { FC, ReactNode } from 'react';
import { TabsTrigger } from 'fumadocs-ui/components/tabs';
import { cn } from '@/lib/cn';
import { statusLabel } from '@/lib/http-status';
import { ERRORS_PAGE, isErrorCode, splitResponseCodes } from '@/lib/response-codes';

// The codes of an operation's responses as two controls: a tab for each
// success code and one select, "Errors", for every error code. It stands in for
// fumadocs-openapi's row of one tab per code in two places, the "Response body"
// heading and the example response beside the request, through
// `content.renderResponseCodes` (patches/fumadocs-openapi@12.4.1.patch adds it).
// A select is a native control, so it is reachable and operable by keyboard
// with nothing added; a chosen code is shown in it and picks that code's panel.

type SegmentedListProps = { items: { value: string; label: ReactNode }[]; className?: string };

type Props = {
  codes: string[];
  value: string;
  onValueChange: (code: string) => void;
  kind: 'segmented' | 'tabs';
  SegmentedList?: FC<SegmentedListProps>;
};

function ErrorsSelect({ errors, value, onValueChange }: Pick<Props, 'value' | 'onValueChange'> & { errors: string[] }) {
  const chosen = isErrorCode(value);
  return (
    <span className="ms-auto inline-flex shrink-0 items-center gap-2 not-prose text-xs">
      <select
        aria-label="Errors"
        value={chosen ? value : ''}
        onChange={(event) => event.target.value && onValueChange(event.target.value)}
        className={cn(
          'h-7 max-w-44 cursor-pointer rounded-md border bg-fd-background px-2 font-mono text-xs text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
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

export function ResponseCodes({ codes, value, onValueChange, kind, SegmentedList }: Props) {
  const { success, errors } = splitResponseCodes(codes);
  const select = errors.length > 0 && <ErrorsSelect errors={errors} value={value} onValueChange={onValueChange} />;

  if (kind === 'segmented' && SegmentedList) {
    return (
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
        {success.length > 0 && (
          <SegmentedList className="font-mono" items={success.map((code) => ({ value: code, label: code }))} />
        )}
        {select}
      </div>
    );
  }

  return (
    <>
      {success.map((code) => (
        <TabsTrigger key={code} value={code}>
          {code}
        </TabsTrigger>
      ))}
      {select}
    </>
  );
}
