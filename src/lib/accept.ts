type Range = { type: string; subtype: string; q: number; index: number };

function parseAccept(header: string): Range[] {
  const ranges: Range[] = [];
  header.split(',').forEach((part, index) => {
    const [media, ...params] = part.split(';').map((s) => s.trim());
    const [type, subtype, ...rest] = (media ?? '').toLowerCase().split('/');
    if (!type || !subtype || rest.length > 0) return;

    let q = 1;
    let valid = true;
    for (const param of params) {
      if (!/^q\s*=/i.test(param)) continue;
      const match = /^q\s*=\s*(\d(?:\.\d{0,3})?)$/i.exec(param);
      if (match) q = Math.min(1, Math.max(0, Number(match[1])));
      else valid = false;
    }
    if (valid) ranges.push({ type, subtype, q, index });
  });
  return ranges;
}

/** The range that decides a media type: the most specific one that covers it. */
function bestMatch(ranges: Range[], type: string, subtype: string) {
  let best: (Range & { specificity: number }) | undefined;
  for (const range of ranges) {
    let specificity = -1;
    if (range.type === type && range.subtype === subtype) specificity = 2;
    else if (range.type === type && range.subtype === '*') specificity = 1;
    else if (range.type === '*' && range.subtype === '*') specificity = 0;
    if (specificity > (best?.specificity ?? -1)) best = { ...range, specificity };
  }
  return best;
}

/**
 * Whether an `Accept` header asks for Markdown ahead of HTML (RFC 9110, section
 * 12.5.1). Markdown wins on a higher quality value. On equal values it wins only
 * when the header names `text/markdown` itself and lists it before `text/html`,
 * so a header that lists `text/markdown` first, then `text/html` and a wildcard,
 * gets Markdown, while a bare wildcard, a `text` wildcard or a browser's header,
 * which all rank HTML at least as high, gets HTML.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const ranges = parseAccept(accept);
  const markdown = bestMatch(ranges, 'text', 'markdown');
  if (!markdown || markdown.q === 0) return false;

  const html = bestMatch(ranges, 'text', 'html');
  if (!html || html.q === 0) return true;
  if (markdown.q !== html.q) return markdown.q > html.q;
  return markdown.specificity === 2 && (html.specificity < 2 || markdown.index < html.index);
}
