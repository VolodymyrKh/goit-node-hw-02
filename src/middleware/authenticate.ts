import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import createHttpError from "http-errors";

const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET is not set in environment variables");
}
export const JWT_SECRET: string = secret;

export type TokenType = "access" | "refresh";

export interface TokenPayload extends jwt.JwtPayload {
  sub: string; // user id
  type: TokenType;
}

// Adds req.user to the Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Checks signature, expiry and token type; throws on failure
export function verifyToken(token: string, expectedType: TokenType): TokenPayload {
  const payload = jwt.verify(token, JWT_SECRET);

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    payload.type !== expectedType
  ) {
    throw new Error("Invalid token payload");
  }

  return payload as TokenPayload;
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw createHttpError(401, "Missing or invalid Authorization header");
  }

  try {
    req.user = verifyToken(token, "access");
  } catch (err) {
    throw createHttpError(
      401,
      err instanceof jwt.TokenExpiredError ? "Token expired" : "Invalid token",
    );
  }

  next();
};

// Use only after authenticate
export function getUserId(req: Request): number {
  if (!req.user) {
    throw createHttpError(401, "Unauthorized");
  }
  return Number(req.user.sub);
}
