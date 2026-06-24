import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, setToken, clearToken, hasToken } from '@/lib/api';

export interface User {
  id: number;
  name: string;
  login: string;
  role: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((d) => setUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (l: string, p: string) => {
    const d = await authApi.login(l, p);
    setToken(d.token);
    setUser(d.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
