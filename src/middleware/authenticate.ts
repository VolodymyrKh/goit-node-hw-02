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
  sub: string; // user id (JWT requires sub to be a string)
  type: TokenType;
}

// Module augmentation: lets TypeScript know about req.user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Verifies a JWT and checks that it is of the expected type.
 * Throws jsonwebtoken errors for a bad signature / expired token,
 * and a plain Error for a wrong payload shape or token type.
 */
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

/** Returns the authenticated user's id. Use only after `authenticate`. */
export function getUserId(req: Request): number {
  if (!req.user) {
    throw createHttpError(401, "Unauthorized");
  }
  return Number(req.user.sub);
}
