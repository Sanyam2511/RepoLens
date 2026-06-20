import crypto from "node:crypto";
import { AuthSessionPayload, AuthUser } from "shared";
import { prisma } from "./storage.js";

const hashPassword = (password: string, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { hash, salt };
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const stripPassword = (user: any): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export const createUser = async (name: string, email: string, password: string): Promise<AuthSessionPayload> => {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const { hash, salt } = hashPassword(password);
  
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
    }
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
    }
  });

  return { token, user: stripPassword(user) };
};

export const loginUser = async (email: string, password: string): Promise<AuthSessionPayload> => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user || !user.passwordSalt || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const { hash } = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
    }
  });

  return { token, user: stripPassword(user) };
};

export const getUserFromToken = async (token: string | null | undefined): Promise<AuthUser | null> => {
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session) {
    return null;
  }

  return stripPassword(session.user);
};

export const revokeToken = async (token: string | null | undefined) => {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { token }
  });
};

export const loginWithGithub = async (profile: any, accessToken: string): Promise<AuthSessionPayload> => {
  let user = await prisma.user.findUnique({
    where: { githubId: String(profile.id) }
  });

  const normalizedEmail = profile.email ? normalizeEmail(profile.email) : undefined;

  if (!user && normalizedEmail) {
    // Check if user exists by email but hasn't linked github
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          githubId: String(profile.id),
          githubAccessToken: accessToken
        }
      });
    }
  }

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        name: profile.name || profile.login,
        email: normalizedEmail || `${profile.login}@users.noreply.github.com`,
        githubId: String(profile.id),
        githubAccessToken: accessToken,
      }
    });
  } else {
    // Update existing user access token
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        githubAccessToken: accessToken
      }
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
    }
  });

  return { token, user: stripPassword(user) };
};

export const getStoredUserByAuthToken = async (token: string | null | undefined): Promise<any | null> => {
  if (!token) return null;
  
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });
  
  if (!session) return null;
  return session.user;
};
