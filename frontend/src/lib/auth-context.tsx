'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export type Role =
  | 'super_admin'
  | 'admin_local'
  | 'dg'
  | 'daf'
  | 'moyens_generaux'
  | 'technique'
  | 'rh'
  | 'ingenieur';

export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => undefined,
  logout: () => undefined
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const tokenFromCookie = Cookies.get('anesp_token');
    const userFromCookie = Cookies.get('anesp_user');
    if (tokenFromCookie && userFromCookie) {
      setToken(tokenFromCookie);
      try {
        setUser(JSON.parse(userFromCookie));
      } catch {
        Cookies.remove('anesp_user');
      }
    }
  }, []);

  const login = (nextUser: AuthUser, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    Cookies.set('anesp_token', nextToken);
    Cookies.set('anesp_user', JSON.stringify(nextUser));
    router.push('/dashboard');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    Cookies.remove('anesp_token');
    Cookies.remove('anesp_user');
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
