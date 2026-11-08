import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent(
  "securitySchemes",
  "bearerAuth",
  {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  },
);

// Shared error schemas (match the error handler in app.ts)
export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Error message" }),
  })
  .openapi("Error");

export const ValidationErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Validation failed" }),
    details: z.record(z.string(), z.array(z.string())).openapi({
      example: { body: ["username: Too small: expected string to have >=3 characters"] },
    }),
  })
  .openapi("ValidationError");

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Announcements Board API",
      version: "1.0.0",
      description: "REST API for an announcements board with JWT authentication",
    },
    servers: [{ url: "http://localhost:3000" }],
  });
}
