import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AuthSessionPayload, AuthUser } from "shared";

type StoredUser = AuthUser & {
  passwordHash?: string;
  passwordSalt?: string;
  githubId?: string;
  githubAccessToken?: string;
};

type StoredSession = {
  token: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type AuthStoreFile = {
  users: StoredUser[];
  sessions: StoredSession[];
};

const resolveTempDir = () => process.env.REPOLENS_TEMP_DIR || path.join(process.cwd(), "temp");
const AUTH_STORE_PATH = path.join(resolveTempDir(), "auth-store.json");

const defaultStore = (): AuthStoreFile => ({ users: [], sessions: [] });

const readStore = (): AuthStoreFile => {
  try {
    if (!fs.existsSync(AUTH_STORE_PATH)) {
      return defaultStore();
    }

    const raw = fs.readFileSync(AUTH_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AuthStoreFile>;
    return {
      users: Array.isArray(parsed.users) ? (parsed.users as StoredUser[]) : [],
      sessions: Array.isArray(parsed.sessions) ? (parsed.sessions as StoredSession[]) : [],
    };
  } catch {
    return defaultStore();
  }
};

const writeStore = (store: AuthStoreFile) => {
  fs.mkdirSync(path.dirname(AUTH_STORE_PATH), { recursive: true });
  fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
};

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { hash, salt };
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const stripPassword = (user: StoredUser): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const createUser = (name: string, email: string, password: string): AuthSessionPayload => {
  const store = readStore();
  const normalizedEmail = normalizeEmail(email);

  if (store.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Email already registered");
  }

  const now = new Date().toISOString();
  const { hash, salt } = hashPassword(password);
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now,
  };

  const token = crypto.randomBytes(32).toString("hex");
  store.users.unshift(user);
  store.sessions.unshift({ token, userId: user.id, createdAt: now, updatedAt: now });
  writeStore(store);

  return { token, user: stripPassword(user) };
};

export const loginUser = (email: string, password: string): AuthSessionPayload => {
  const store = readStore();
  const normalizedEmail = normalizeEmail(email);
  const user = store.users.find((item) => item.email === normalizedEmail);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const { hash } = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const now = new Date().toISOString();
  const token = crypto.randomBytes(32).toString("hex");
  store.sessions.unshift({ token, userId: user.id, createdAt: now, updatedAt: now });
  writeStore(store);

  return { token, user: stripPassword(user) };
};

export const getUserFromToken = (token: string | null | undefined): AuthUser | null => {
  if (!token) {
    return null;
  }

  const store = readStore();
  const session = store.sessions.find((item) => item.token === token);
  if (!session) {
    return null;
  }

  const user = store.users.find((item) => item.id === session.userId);
  return user ? stripPassword(user) : null;
};

export const revokeToken = (token: string | null | undefined) => {
  if (!token) {
    return;
  }

  const store = readStore();
  const nextSessions = store.sessions.filter((item) => item.token !== token);
  if (nextSessions.length === store.sessions.length) {
    return;
  }

  writeStore({ ...store, sessions: nextSessions });
};

export const exportAuthStorePath = AUTH_STORE_PATH;

export const loginWithGithub = (profile: any, accessToken: string): AuthSessionPayload => {
  const store = readStore();
  let user = store.users.find(u => u.githubId === String(profile.id));

  const normalizedEmail = profile.email ? normalizeEmail(profile.email) : undefined;

  if (!user && normalizedEmail) {
    // Check if user exists by email but hasn't linked github
    user = store.users.find(u => u.email === normalizedEmail);
    if (user) {
      user.githubId = String(profile.id);
      user.githubAccessToken = accessToken;
    }
  }

  if (!user) {
    // Create new user
    const now = new Date().toISOString();
    user = {
      id: crypto.randomUUID(),
      name: profile.name || profile.login,
      email: normalizedEmail || `${profile.login}@users.noreply.github.com`,
      githubId: String(profile.id),
      githubAccessToken: accessToken,
      createdAt: now,
      updatedAt: now,
    };
    store.users.unshift(user);
  } else {
    // Update existing user access token
    user.githubAccessToken = accessToken;
  }

  const now = new Date().toISOString();
  const token = crypto.randomBytes(32).toString("hex");
  store.sessions.unshift({ token, userId: user.id, createdAt: now, updatedAt: now });
  writeStore(store);

  return { token, user: stripPassword(user) };
};

export const getStoredUserByAuthToken = (token: string | null | undefined): StoredUser | null => {
  if (!token) return null;
  const store = readStore();
  const session = store.sessions.find((item) => item.token === token);
  if (!session) return null;
  return store.users.find((item) => item.id === session.userId) || null;
};
