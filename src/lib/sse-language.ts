// A Shiki language for a server-sent event stream (`text/event-stream`), so a
// stream's response block draws its field names like a header's and its
// `data:` payload as JSON. Fenced as `sse`. A line that starts with a colon is
// a comment, which Marfa uses for its keep-alive and its "connected" line.

const field = { name: 'entity.name.tag.sse' };
const colon = { name: 'punctuation.separator.key-value.sse' };

export const sseLanguage = {
  name: 'sse',
  scopeName: 'source.sse',
  embeddedLangs: ['json'],
  patterns: [
    { match: '^:.*$', name: 'comment.line.sse' },
    {
      begin: '^(data)(:)[ \\t]?',
      beginCaptures: { '1': field, '2': colon },
      end: '$',
      patterns: [{ include: 'source.json' }],
    },
    {
      match: '^([A-Za-z][\\w-]*)(:)[ \\t]?(.*)$',
      captures: { '1': field, '2': colon, '3': { name: 'string.unquoted.sse' } },
    },
  ],
};
