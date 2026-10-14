import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Usuario } from '@bar/shared';
import { api } from './api';

interface AuthCtx {
  user: Usuario | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(() => JSON.parse(localStorage.getItem('user') ?? 'null'));

  async function login(email: string, senha: string) {
    const r = await api<{ token: string; usuario: Usuario }>('/auth/login', { method: 'POST', body: { email, senha } });
    localStorage.setItem('token', r.token);
    localStorage.setItem('user', JSON.stringify(r.usuario));
    setUser(r.usuario);
  }
  function logout() {
    localStorage.clear();
    setUser(null);
  }
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
