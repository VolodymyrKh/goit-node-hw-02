import { Router } from "express";

import {
  getAnnouncementById,
  listAnnouncements,
} from "../controllers/announcements.controller.ts";
import { validateParams, validateQuery } from "../middleware/validate.ts";
import {
  AnnouncementListSchema,
  AnnouncementSchema,
  announcementIdParamsSchema,
  listAnnouncementsQuerySchema,
} from "../validators/announcements.validator.ts";
import { ErrorSchema, ValidationErrorSchema, registry } from "../openapi.ts";

const router = Router();

// Public routes
router.get("/", validateQuery(listAnnouncementsQuerySchema), listAnnouncements);
router.get("/:id", validateParams(announcementIdParamsSchema), getAnnouncementById);

export default router;

// ---------- OpenAPI documentation ----------

const json = <T>(schema: T) => ({ "application/json": { schema } });

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "List announcements with pagination, search and sorting",
  request: { query: listAnnouncementsQuerySchema },
  responses: {
    200: { description: "Paginated list", content: json(AnnouncementListSchema) },
    400: { description: "Invalid query parameters", content: json(ValidationErrorSchema) },
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get an announcement by ID",
  request: { params: announcementIdParamsSchema },
  responses: {
    200: { description: "Announcement with author", content: json(AnnouncementSchema) },
    400: { description: "Invalid ID", content: json(ValidationErrorSchema) },
    404: { description: "Announcement not found", content: json(ErrorSchema) },
  },
});
