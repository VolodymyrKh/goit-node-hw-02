import { z } from "zod";
import "../openapi.ts"; // ensures extendZodWithOpenApi(z) has run
import { UserSchema } from "./auth.validator.ts";

export const CATEGORIES = ["sale", "service", "job", "other"] as const;
export const PER_PAGE = 10;

const categorySchema = z.enum(CATEGORIES).openapi({ example: "sale" });

// ---------- Request schemas ----------

export const createAnnouncementSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5)
      .max(50)
      .openapi({ example: "Продам велосипед" }),
    description: z
      .string()
      .trim()
      .min(10)
      .openapi({ example: "Гірський велосипед, 21 швидкість" }),
    price: z.number().positive().openapi({ example: 8000 }),
    category: categorySchema,
  })
  .openapi("CreateAnnouncementRequest");

export const updateAnnouncementSchema = createAnnouncementSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .openapi("UpdateAnnouncementRequest");

export const announcementIdParamsSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: "id", in: "path" }, example: 5 }),
});

export const listAnnouncementsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .optional()
    .openapi({ description: "Case-insensitive search by title", example: "ноутбук" }),
  sort: z
    .enum(["newest", "oldest"])
    .default("newest")
    .openapi({ description: "Sort by createdAt" }),
  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1)
    .openapi({ description: "Page number (10 items per page)", example: 1 }),
});

export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementBody = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementIdParams = z.infer<typeof announcementIdParamsSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;

// ---------- Response schemas (OpenAPI only) ----------

export const AnnouncementSchema = z
  .object({
    id: z.number().int().openapi({ example: 5 }),
    title: z.string().openapi({ example: "Продам ноутбук ASUS" }),
    description: z.string().openapi({ example: "Відмінний стан, 16GB RAM" }),
    price: z.number().openapi({ example: 18000 }),
    category: categorySchema,
    createdAt: z.iso.datetime().openapi({ example: "2025-01-10T12:00:00.000Z" }),
    updatedAt: z.iso.datetime().openapi({ example: "2025-01-10T12:00:00.000Z" }),
    user: UserSchema,
  })
  .openapi("Announcement");

export const AnnouncementListSchema = z
  .object({
    data: z.array(AnnouncementSchema),
    pagination: z.object({
      total: z.number().int().openapi({ example: 23 }),
      page: z.number().int().openapi({ example: 2 }),
      totalPages: z.number().int().openapi({ example: 3 }),
      perPage: z.number().int().openapi({ example: PER_PAGE }),
    }),
  })
  .openapi("AnnouncementList");
