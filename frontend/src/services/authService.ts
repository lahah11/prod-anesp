import Cookies from 'js-cookie';

import api from './api';

const STORAGE_KEY = 'anesp_user';
const TOKEN_COOKIE = 'anesp_token';

type StoredUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  permissions: string[];
};

function saveUser(user: StoredUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function loadUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredUser>;
    return {
      id: parsed.id as number,
      first_name: parsed.first_name as string,
      last_name: parsed.last_name as string,
      email: parsed.email as string,
      role: parsed.role as string,
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : []
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function clearUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    if (!token || !user) {
      throw new Error('Réponse de connexion invalide');
    }
    const formattedUser: StoredUser = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      permissions: Array.isArray(user.permissions) ? user.permissions : []
    };
    Cookies.set(TOKEN_COOKIE, token, { expires: 1 });
    Cookies.set('anesp_user', JSON.stringify(formattedUser), { expires: 1 });
    saveUser(formattedUser);
    return { token, user: formattedUser };
  },

  logout() {
    Cookies.remove(TOKEN_COOKIE);
    Cookies.remove('anesp_user');
    clearUser();
  },

  async getProfile() {
    const stored = loadUser();
    if (stored) {
      return { user: stored };
    }
    const cookieUser = Cookies.get('anesp_user');
    if (cookieUser) {
      try {
        const parsed = JSON.parse(cookieUser) as Partial<StoredUser>;
        const normalised: StoredUser = {
          id: parsed.id as number,
          first_name: parsed.first_name as string,
          last_name: parsed.last_name as string,
          email: parsed.email as string,
          role: parsed.role as string,
          permissions: Array.isArray(parsed.permissions) ? parsed.permissions : []
        };
        saveUser(normalised);
        return { user: normalised };
      } catch {
        Cookies.remove('anesp_user');
      }
    }
    return { user: null };
  },

  getToken() {
    return Cookies.get(TOKEN_COOKIE) || null;
  },

  removeToken() {
    Cookies.remove(TOKEN_COOKIE);
    Cookies.remove('anesp_user');
    clearUser();
  }
};