import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import createHttpError from "http-errors";

import prisma from "../../prisma/client.ts";
import { JWT_SECRET, getUserId, verifyToken } from "../middleware/authenticate.ts";
import type {
  LoginBody,
  RefreshBody,
  RegisterBody,
} from "../validators/auth.validator.ts";

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";

// Compared when the user is missing, so timing doesn't reveal valid usernames
const DUMMY_HASH = bcrypt.hashSync("dummy-password", SALT_ROUNDS);

// Public user fields (no password)
export const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
} as const;

function generateTokens(userId: number) {
  const sub = String(userId);

  const accessToken = jwt.sign({ type: "access" }, JWT_SECRET, {
    subject: sub,
    expiresIn: ACCESS_TOKEN_TTL,
  });

  // jwtid keeps tokens unique within the same second
  const refreshToken = jwt.sign({ type: "refresh" }, JWT_SECRET, {
    subject: sub,
    expiresIn: REFRESH_TOKEN_TTL,
    jwtid: randomUUID(),
  });

  return { accessToken, refreshToken };
}

// POST /auth/register
export const register: RequestHandler = async (req, res) => {
  const { username, email, password, name } = req.body as RegisterBody;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });
  if (existing) {
    throw createHttpError(409, "Username or email already taken");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, name },
    select: publicUserSelect,
  });

  const tokens = generateTokens(user.id);
  await prisma.refreshToken.create({
    data: { token: tokens.refreshToken, userId: user.id },
  });

  res.status(201).json({ user, ...tokens });
};

// POST /auth/login
export const login: RequestHandler = async (req, res) => {
  const { username, password } = req.body as LoginBody;

  const user = await prisma.user.findUnique({ where: { username } });
  const passwordMatches = await bcrypt.compare(
    password,
    user?.password ?? DUMMY_HASH,
  );

  if (!user || !passwordMatches) {
    throw createHttpError(401, "Invalid credentials");
  }

  const tokens = generateTokens(user.id);

  // Replace old refresh tokens
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    prisma.refreshToken.create({
      data: { token: tokens.refreshToken, userId: user.id },
    }),
  ]);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    ...tokens,
  });
};

// POST /auth/refresh
export const refresh: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body as RefreshBody;

  try {
    verifyToken(refreshToken, "refresh");
  } catch {
    throw createHttpError(401, "Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!stored) {
    throw createHttpError(401, "Invalid refresh token");
  }

  const tokens = generateTokens(stored.userId);

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.deleteMany({
      where: { id: stored.id },
    });
    if (count === 0) {
      throw createHttpError(401, "Invalid refresh token");
    }
    await tx.refreshToken.create({
      data: { token: tokens.refreshToken, userId: stored.userId },
    });
  });

  res.json(tokens);
};

// POST /auth/logout
export const logout: RequestHandler = async (req, res) => {
  const userId = getUserId(req);

  // deleteMany doesn't throw when nothing matches
  await prisma.refreshToken.deleteMany({ where: { userId } });

  res.status(204).end();
};

// GET /auth/me
export const me: RequestHandler = async (req, res) => {
  const userId = getUserId(req);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...publicUserSelect, createdAt: true },
  });
  if (!user) {
    throw createHttpError(404, "User not found");
  }

  res.json(user);
};
