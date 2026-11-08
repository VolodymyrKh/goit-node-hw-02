import { z } from "zod";
import "../openapi.ts"; // ensures extendZodWithOpenApi(z) has run

// ---------- Request schemas ----------

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .openapi({ example: "volodymyr_kheroim" }),
    email: z.email().openapi({ example: "volodymyr@example.com" }),
    password: z.string().min(6).openapi({ example: "secret123" }),
    name: z.string().trim().min(2).openapi({ example: "Volodymyr" }),
  })
  .openapi("RegisterRequest");

export const loginSchema = z
  .object({
    username: z.string().trim().min(1).openapi({ example: "volodymyr_kheroim" }),
    password: z.string().min(1).openapi({ example: "secret123" }),
  })
  .openapi("LoginRequest");

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1).openapi({ example: "eyJhbGci..." }),
  })
  .openapi("RefreshRequest");

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;

// ---------- Response schemas (OpenAPI only) ----------

export const UserSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    username: z.string().openapi({ example: "volodymyr_kheroim" }),
    email: z.string().openapi({ example: "volodymyr@example.com" }),
    name: z.string().openapi({ example: "Volodymyr" }),
  })
  .openapi("User");

export const TokensSchema = z
  .object({
    accessToken: z.string().openapi({ example: "eyJhbGci..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGci..." }),
  })
  .openapi("Tokens");

export const AuthResponseSchema = z
  .object({
    user: UserSchema,
    accessToken: z.string().openapi({ example: "eyJhbGci..." }),
    refreshToken: z.string().openapi({ example: "eyJhbGci..." }),
  })
  .openapi("AuthResponse");

export const MeResponseSchema = UserSchema.extend({
  createdAt: z.iso
    .datetime()
    .openapi({ example: "2025-01-10T12:00:00.000Z" }),
}).openapi("Me");
