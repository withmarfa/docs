// The status chip on a response block: `status="200"` draws "200 OK".

const REASONS: Record<string, string> = {
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '204': 'No Content',
  '301': 'Moved Permanently',
  '302': 'Found',
  '304': 'Not Modified',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '409': 'Conflict',
  '410': 'Gone',
  '412': 'Precondition Failed',
  '413': 'Content Too Large',
  '415': 'Unsupported Media Type',
  '422': 'Unprocessable Content',
  '423': 'Locked',
  '428': 'Precondition Required',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
};

/** "200 OK", or the bare code when no reason phrase is known. */
export function statusLabel(code: string): string {
  const reason = REASONS[code];
  return reason ? `${code} ${reason}` : code;
}

/** Success is mint, an error red, and anything else (a redirect, say) neutral. */
export function statusTone(code: string): 'ok' | 'error' | 'neutral' {
  if (/^2\d\d$/.test(code)) return 'ok';
  if (/^[45]\d\d$/.test(code)) return 'error';
  return 'neutral';
}
