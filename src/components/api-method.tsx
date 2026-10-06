import {
  ArrowDownLeft,
  ArrowUpRight,
  Diff,
  Eye,
  ListChecks,
  Repeat2,
  Webhook,
  X,
  type LucideIcon,
} from 'lucide-react';

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

const methodIcons: Record<ApiMethod, LucideIcon> = {
  GET: ArrowDownLeft,
  POST: ArrowUpRight,
  PUT: Repeat2,
  PATCH: Diff,
  DELETE: X,
  HEAD: Eye,
  OPTIONS: ListChecks,
  WEBHOOK: Webhook,
};

export function parseApiMethod(value: unknown): ApiMethod | undefined {
  if (typeof value !== 'string') return undefined;

  const method = value.toUpperCase() as ApiMethod;
  return API_METHODS.includes(method) ? method : undefined;
}

export function ApiMethod({ method }: { method: ApiMethod }) {
  const Icon = methodIcons[method];

  return (
    <span
      className={`marfa-api-method marfa-api-method--${method.toLowerCase()}`}
      title={method === 'WEBHOOK' ? 'Webhook' : `${method} method`}
    >
      <span className="marfa-api-method-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="marfa-api-method-label">{method}</span>
    </span>
  );
}
