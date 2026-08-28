export interface Job {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  title?: string | null;
  prompt: string;
  lyrics?: string | null;
  tags?: string | null;
  seed?: number | null;
  duration_ms: number;
  audio_url?: string | null;
  error_msg?: string | null;
  created_at: string;
  deleted_at?: string | null;
  generation_time_seconds?: number | null;
}

export interface GeneratePayload {
  prompt: string;
  lyrics?: string;
  tags?: string;
  duration_ms?: number;
  seed?: number;
  title?: string;
  mock?: boolean;
}

// ===== token 管理 =====
const TOKEN_KEY = 'retro_music_token';
let TOKEN: string | null = localStorage.getItem(TOKEN_KEY);

export function getToken(): string | null {
  return TOKEN;
}

export function setToken(t: string | null): void {
  TOKEN = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

// 给 <audio>/<a> 这类无法带 Authorization 头的请求，用查询参数带上 token
function withToken(url: string): string {
  if (!TOKEN || !url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(TOKEN)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(path, { headers, ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}

export const api = {
  setToken,

  authStatus: () => request<{ auth_required: boolean }>('/api/v1/auth/status'),

  login: (code: string) =>
    request<{ token: string; user: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  generate: (payload: GeneratePayload) =>
    request<{ job_id: string; status: string }>('/api/v1/music/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getJob: (id: string) => request<Job>(`/api/v1/jobs/${id}`),

  listJobs: () => request<Job[]>('/api/v1/jobs'),

  listTrash: () => request<Job[]>('/api/v1/trash'),

  softDelete: (id: string) =>
    request<{ status: string }>(`/api/v1/jobs/${id}/delete`, { method: 'POST' }),

  restore: (id: string) =>
    request<{ status: string }>(`/api/v1/jobs/${id}/restore`, { method: 'POST' }),

  purge: (id: string) =>
    request<{ status: string }>(`/api/v1/jobs/${id}`, { method: 'DELETE' }),

  enhance: (topic: string) =>
    request<{ topic: string; tags: string }>('/api/v1/lyrics/enhance', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    }),

  downloadUrl: (id: string) => withToken(`/api/v1/jobs/${id}/download`),

  audioUrl: (path: string) => withToken(path),

  events: () => new EventSource(`/api/v1/events?token=${encodeURIComponent(TOKEN || '')}`),
};
