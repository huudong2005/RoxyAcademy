import { setStorage, getStorage, removeStorage } from 'zmp-sdk/apis';
import type { UserInfo } from '@/types/auth';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'roxy_miniapp_access_token',
  EXPIRES_AT: 'roxy_miniapp_expires_at',
  USER: 'roxy_miniapp_user',
  ACTIVE_STUDENT_ID: 'roxy_miniapp_active_student_id',
} as const;

let cachedToken: string | null = null;
let cachedExpiresAt: string | null = null;
let cachedUser: UserInfo | null = null;

function readFallbackLocal(key: string): any {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

function writeFallbackLocal(data: Record<string, any>): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) {
        window.localStorage.removeItem(k);
      } else {
        window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    });
  } catch {
    // ignore browser storage errors
  }
}

function removeFallbackLocal(keys: string[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export async function saveStorageData(data: Record<string, any>): Promise<void> {
  if (STORAGE_KEYS.ACCESS_TOKEN in data) {
    cachedToken = data[STORAGE_KEYS.ACCESS_TOKEN] || null;
  }
  if (STORAGE_KEYS.EXPIRES_AT in data) {
    cachedExpiresAt = data[STORAGE_KEYS.EXPIRES_AT] || null;
  }
  if (STORAGE_KEYS.USER in data) {
    cachedUser = data[STORAGE_KEYS.USER] || null;
  }

  writeFallbackLocal(data);

  try {
    await setStorage({ data });
  } catch {
    // Fallback to localStorage already saved when running outside Zalo WebView
  }
}

export async function loadStorageData(keys: string[]): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  try {
    const zmpData = await getStorage({ keys });
    if (zmpData && typeof zmpData === 'object') {
      Object.assign(result, zmpData);
    }
  } catch {
    // Running on standard web browser outside Zalo WebView -> use fallback below
  }

  keys.forEach((k) => {
    if (result[k] === undefined || result[k] === null) {
      const localVal = readFallbackLocal(k);
      if (localVal !== null && localVal !== undefined) {
        result[k] = localVal;
      }
    }
  });

  if (result[STORAGE_KEYS.ACCESS_TOKEN]) {
    cachedToken = String(result[STORAGE_KEYS.ACCESS_TOKEN]);
  }
  if (result[STORAGE_KEYS.EXPIRES_AT]) {
    cachedExpiresAt = String(result[STORAGE_KEYS.EXPIRES_AT]);
  }
  if (result[STORAGE_KEYS.USER]) {
    const rawUser = result[STORAGE_KEYS.USER];
    if (typeof rawUser === 'string') {
      try {
        cachedUser = JSON.parse(rawUser);
        result[STORAGE_KEYS.USER] = cachedUser;
      } catch {
        cachedUser = null;
      }
    } else if (typeof rawUser === 'object') {
      cachedUser = rawUser as UserInfo;
    }
  }

  return result;
}

export async function clearStorageKeys(keys: string[]): Promise<void> {
  if (keys.includes(STORAGE_KEYS.ACCESS_TOKEN)) cachedToken = null;
  if (keys.includes(STORAGE_KEYS.EXPIRES_AT)) cachedExpiresAt = null;
  if (keys.includes(STORAGE_KEYS.USER)) cachedUser = null;

  removeFallbackLocal(keys);

  try {
    await removeStorage({ keys });
  } catch {
    // Fallback to localStorage already cleared
  }
}

export async function saveAuthSession(payload: {
  accessToken: string;
  expiresAt: string;
  user: UserInfo;
}): Promise<void> {
  await saveStorageData({
    [STORAGE_KEYS.ACCESS_TOKEN]: payload.accessToken,
    [STORAGE_KEYS.EXPIRES_AT]: payload.expiresAt,
    [STORAGE_KEYS.USER]: payload.user,
  });
}

export async function loadAuthSession(): Promise<{
  accessToken: string | null;
  expiresAt: string | null;
  user: UserInfo | null;
}> {
  const data = await loadStorageData([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.EXPIRES_AT,
    STORAGE_KEYS.USER,
  ]);
  return {
    accessToken: data[STORAGE_KEYS.ACCESS_TOKEN] ? String(data[STORAGE_KEYS.ACCESS_TOKEN]) : null,
    expiresAt: data[STORAGE_KEYS.EXPIRES_AT] ? String(data[STORAGE_KEYS.EXPIRES_AT]) : null,
    user: (data[STORAGE_KEYS.USER] as UserInfo) || null,
  };
}

export async function clearAuthSession(): Promise<void> {
  await clearStorageKeys([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.EXPIRES_AT,
    STORAGE_KEYS.USER,
    STORAGE_KEYS.ACTIVE_STUDENT_ID,
  ]);
}

export function getCachedAccessToken(): string | null {
  if (cachedToken) return cachedToken;
  const fallback = readFallbackLocal(STORAGE_KEYS.ACCESS_TOKEN);
  if (typeof fallback === 'string' && fallback.trim()) {
    cachedToken = fallback.trim();
    return cachedToken;
  }
  return null;
}

export function getCachedExpiresAt(): string | null {
  if (cachedExpiresAt) return cachedExpiresAt;
  const fallback = readFallbackLocal(STORAGE_KEYS.EXPIRES_AT);
  if (typeof fallback === 'string' && fallback.trim()) {
    cachedExpiresAt = fallback.trim();
    return cachedExpiresAt;
  }
  return null;
}

export function getCachedUser(): UserInfo | null {
  if (cachedUser) return cachedUser;
  const fallback = readFallbackLocal(STORAGE_KEYS.USER);
  if (fallback && typeof fallback === 'object') {
    cachedUser = fallback as UserInfo;
    return cachedUser;
  }
  return null;
}
