import { env } from './env';
import { clearAuth, getToken } from './auth';

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
};

function toQueryString(params: Options['params']): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.set(k, String(v));
  return `?${sp.toString()}`;
}

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(opts.headers);
  if (!headers.has('Content-Type') && opts.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Token ${token}`);

  const url = `${env.API_URL}${path}${toQueryString(opts.params)}`;
  const body =
    opts.body === undefined
      ? undefined
      : typeof opts.body === 'string'
        ? opts.body
        : JSON.stringify(opts.body);

  const res = await fetch(url, { ...opts, headers, body });

  if (res.status === 401) {
    clearAuth();
    if (!location.pathname.startsWith('/login')) {
      location.href = '/login';
    }
    throw new ApiError('Unauthorized', 401);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '');

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, params?: Options['params']) =>
    apiFetch<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
