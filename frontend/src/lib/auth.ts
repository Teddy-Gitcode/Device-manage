import type { Role, UserProfile } from '@/types/api';

const TOKEN_KEY = 'dm_auth_token';
const USER_KEY = 'dm_auth_user';

const ROLE_LEVEL: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser(): UserProfile | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setUser(user: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function getRole(): Role {
  return getUser()?.role ?? 'viewer';
}

export function canDo(minRole: Role): boolean {
  return ROLE_LEVEL[getRole()] >= ROLE_LEVEL[minRole];
}
