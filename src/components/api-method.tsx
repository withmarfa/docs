export const API_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'WEBHOOK',
] as const;

export type ApiMethod = (typeof API_METHODS)[number];

export function parseApiMethod(value: unknown): ApiMethod | undefined {
  if (typeof value !== 'string') return undefined;

  const method = value.toUpperCase() as ApiMethod;
  return API_METHODS.includes(method) ? method : undefined;
}

export function ApiMethod({ method }: { method: ApiMethod }) {
  return (
    <span
      className={`marfa-api-method marfa-api-method--${method.toLowerCase()}`}
      title={method === 'WEBHOOK' ? 'Webhook' : `${method} method`}
    >
      {method}
    </span>
  );
}
