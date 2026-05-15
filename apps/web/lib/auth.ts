export type StoredAuthSession = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
};

export const AUTH_CHANGED_EVENT = "repolens-auth-changed";
const STORAGE_KEY = "repolens-auth-session";
const WORKER_API_BASE = process.env.NEXT_PUBLIC_WORKER_API_BASE_URL || "http://localhost:4000";

export const getStoredAuthSession = (): StoredAuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
};

export const getAuthToken = () => getStoredAuthSession()?.token ?? null;

export const getStoredAuthUser = () => getStoredAuthSession()?.user ?? null;

export const setAuthSession = (session: StoredAuthSession) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const workerFetch = async (path: string, init: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${WORKER_API_BASE}${path}`, {
    ...init,
    headers,
  });
};
