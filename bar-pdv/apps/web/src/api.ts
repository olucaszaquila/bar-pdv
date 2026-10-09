export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export const getToken = () => localStorage.getItem('token');

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(API_URL + path, {
    method: opts.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && token) {
    localStorage.clear();
    location.href = '/login';
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(typeof e.message === 'string' ? e.message : 'Erro na requisição');
  }
  return res.json();
}
