// web/src/features/auth/AuthContext.tsx
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from 'react';
  import { api } from '@/lib/api';
  
  export type AuthUser = {
    id: number;
    email: string;
  };
  
  type AuthContextValue = {
    user: AuthUser | null;
    loading: boolean;
    refresh: () => Promise<void>;
    setUser: (u: AuthUser | null) => void;
    logout: () => Promise<void>;
  };
  
  const AuthContext = createContext<AuthContextValue | undefined>(undefined);
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
  
    async function refresh() {
      try {
        const data = await api<{ ok: boolean; user: AuthUser | null }>('/auth/me');
        setUser(data.user ?? null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
  
    useEffect(() => {
      void refresh();
    }, []);
  
    async function logout() {
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch {
        // ignore network errors – just clear local state
      }
      setUser(null);
    }
  
    return (
      <AuthContext.Provider value={{ user, loading, refresh, setUser, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }
  
  export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
      throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
  }
  