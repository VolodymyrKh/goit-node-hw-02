import { Router } from "express";

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  listAnnouncements,
  updateAnnouncement,
} from "../controllers/announcements.controller.ts";
import { authenticate } from "../middleware/authenticate.ts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.ts";
import {
  AnnouncementListSchema,
  AnnouncementSchema,
  announcementIdParamsSchema,
  createAnnouncementSchema,
  listAnnouncementsQuerySchema,
  updateAnnouncementSchema,
} from "../validators/announcements.validator.ts";
import {
  ErrorSchema,
  ValidationErrorSchema,
  bearerAuth,
  registry,
} from "../openapi.ts";

const router = Router();

// Public routes
router.get("/", validateQuery(listAnnouncementsQuerySchema), listAnnouncements);
router.get("/:id", validateParams(announcementIdParamsSchema), getAnnouncementById);

// Protected routes
router.post(
  "/",
  authenticate,
  validateBody(createAnnouncementSchema),
  createAnnouncement,
);
router.patch(
  "/:id",
  authenticate,
  validateParams(announcementIdParamsSchema),
  validateBody(updateAnnouncementSchema),
  updateAnnouncement,
);
router.delete(
  "/:id",
  authenticate,
  validateParams(announcementIdParamsSchema),
  deleteAnnouncement,
);

export default router;

// ---------- OpenAPI documentation ----------

const json = <T>(schema: T) => ({ "application/json": { schema } });
const security = [{ [bearerAuth.name]: [] }];
const unauthorized = {
  description: "Missing, invalid or expired access token",
  content: json(ErrorSchema),
};

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

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create an announcement (author is taken from the token)",
  security,
  request: { body: { content: json(createAnnouncementSchema), required: true } },
  responses: {
    201: { description: "Announcement created", content: json(AnnouncementSchema) },
    400: { description: "Validation failed", content: json(ValidationErrorSchema) },
    401: unauthorized,
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Partially update own announcement (at least one field required)",
  security,
  request: {
    params: announcementIdParamsSchema,
    body: { content: json(updateAnnouncementSchema), required: true },
  },
  responses: {
    200: { description: "Announcement updated", content: json(AnnouncementSchema) },
    400: { description: "Validation failed", content: json(ValidationErrorSchema) },
    401: unauthorized,
    403: { description: "Announcement belongs to another user", content: json(ErrorSchema) },
    404: { description: "Announcement not found", content: json(ErrorSchema) },
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete own announcement",
  security,
  request: { params: announcementIdParamsSchema },
  responses: {
    204: { description: "Announcement deleted" },
    400: { description: "Invalid ID", content: json(ValidationErrorSchema) },
    401: unauthorized,
    403: { description: "Announcement belongs to another user", content: json(ErrorSchema) },
    404: { description: "Announcement not found", content: json(ErrorSchema) },
  },
});
