export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.0.10:3333';

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };
export const getToken = () => token;

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique o Wi-Fi.');
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(typeof e.message === 'string' ? e.message : 'Erro na requisição');
  }
  return res.json();
}
