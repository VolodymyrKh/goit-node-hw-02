import { Router } from "express";

import {
  login,
  logout,
  me,
  refresh,
  register,
} from "../controllers/auth.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  AuthResponseSchema,
  MeResponseSchema,
  TokensSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from "../validators/auth.validator.ts";
import {
  ErrorSchema,
  ValidationErrorSchema,
  bearerAuth,
  registry,
} from "../openapi.ts";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/refresh", validateBody(refreshSchema), refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, me);

export default router;

// OpenAPI docs

const json = <T>(schema: T) => ({ "application/json": { schema } });
const security = [{ [bearerAuth.name]: [] }];

registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: { body: { content: json(registerSchema), required: true } },
  responses: {
    201: { description: "User created", content: json(AuthResponseSchema) },
    400: { description: "Validation failed", content: json(ValidationErrorSchema) },
    409: { description: "Username or email already taken", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in with username and password",
  request: { body: { content: json(loginSchema), required: true } },
  responses: {
    200: { description: "Logged in", content: json(AuthResponseSchema) },
    400: { description: "Validation failed", content: json(ValidationErrorSchema) },
    401: { description: "Invalid credentials", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Get a new token pair using a refresh token (token rotation)",
  request: { body: { content: json(refreshSchema), required: true } },
  responses: {
    200: { description: "New token pair", content: json(TokensSchema) },
    400: { description: "Validation failed", content: json(ValidationErrorSchema) },
    401: { description: "Invalid or revoked refresh token", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Log out (invalidate the current user's refresh token)",
  security,
  responses: {
    204: { description: "Logged out" },
    401: { description: "Missing, invalid or expired access token", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get the current user's profile",
  security,
  responses: {
    200: { description: "Current user", content: json(MeResponseSchema) },
    401: { description: "Missing, invalid or expired access token", content: json(ErrorSchema) },
    404: { description: "User not found", content: json(ErrorSchema) },
  },
});
