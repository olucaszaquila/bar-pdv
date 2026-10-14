import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { Usuario } from '@bar/shared';
import { api, setToken } from './api';

interface AuthCtx {
  user: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

const CHAVE = 'auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(CHAVE)
      .then((raw) => {
        if (raw) {
          const s = JSON.parse(raw) as { token: string; usuario: Usuario };
          setToken(s.token);
          setUser(s.usuario);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, senha: string) {
    const r = await api<{ token: string; usuario: Usuario }>('/auth/login', { method: 'POST', body: { email, senha } });
    setToken(r.token);
    await SecureStore.setItemAsync(CHAVE, JSON.stringify(r));
    setUser(r.usuario);
  }
  async function logout() {
    setToken(null);
    await SecureStore.deleteItemAsync(CHAVE);
    setUser(null);
  }
  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}
