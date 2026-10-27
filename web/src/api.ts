import type {
  CccdFilter,
  HealthResponse,
  HouseholdDetail,
  HouseholdListResponse,
  LogsResponse,
  PersonalLogsResponse,
  ReconcileConfirmResponse,
  ReconcileFilter,
  ReconcileResponse,
  Stats,
} from './types';

const BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

type QueryValue = string | number | boolean | null | undefined;

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return `${BASE_URL}${path}`;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const search = params.toString();
  return `${BASE_URL}${path}${search ? `?${search}` : ''}`;
}

async function request<T>(
  path: string,
  query?: Record<string, QueryValue>,
  signal?: AbortSignal,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    ...init,
    signal,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Lỗi ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Giữ thông báo mặc định nếu body không phải JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface HouseholdQuery {
  q: string;
  cccd: CccdFilter;
  includeInactive: boolean;
  page: number;
  pageSize: number;
}

export interface ReconcileQuery {
  q: string;
  issue: ReconcileFilter;
  page: number;
  pageSize: number;
  refresh?: boolean;
}

export interface ReconcileConfirmInput {
  stt: number;
  cccd: string;
  confirmed: boolean;
  acceptDobDiff?: boolean;
  acceptAddressDiff?: boolean;
  personalId?: number | null;
  note?: string;
}

export const api = {
  health: (signal?: AbortSignal) => request<HealthResponse>('/api/health', undefined, signal),

  stats: (includeInactive: boolean, signal?: AbortSignal) =>
    request<Stats>('/api/stats', { includeInactive: includeInactive ? 1 : 0 }, signal),

  households: (query: HouseholdQuery, signal?: AbortSignal) =>
    request<HouseholdListResponse>(
      '/api/households',
      {
        q: query.q,
        cccd: query.cccd,
        includeInactive: query.includeInactive ? 1 : 0,
        page: query.page,
        pageSize: query.pageSize,
      },
      signal,
    ),

  household: (id: number, includeInactive: boolean, signal?: AbortSignal) =>
    request<HouseholdDetail>(
      `/api/households/${id}`,
      { includeInactive: includeInactive ? 1 : 0 },
      signal,
    ),

  personalLogs: (id: number, page: number, pageSize: number, signal?: AbortSignal) =>
    request<PersonalLogsResponse>(
      `/api/personal/${id}/logs`,
      { page, pageSize },
      signal,
    ),

  logs: (q: string, page: number, pageSize: number, signal?: AbortSignal) =>
    request<LogsResponse>('/api/logs', { q, page, pageSize }, signal),

  reconcile: (query: ReconcileQuery, signal?: AbortSignal) =>
    request<ReconcileResponse>(
      '/api/reconcile',
      {
        q: query.q,
        issue: query.issue,
        page: query.page,
        pageSize: query.pageSize,
        refresh: query.refresh ? 1 : 0,
      },
      signal,
    ),

  confirmReconcile: (input: ReconcileConfirmInput, signal?: AbortSignal) =>
    request<ReconcileConfirmResponse>(
      '/api/reconcile/confirm',
      undefined,
      signal,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),
};
