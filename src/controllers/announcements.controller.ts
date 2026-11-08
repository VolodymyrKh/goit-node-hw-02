import type { RequestHandler } from "express";
import createHttpError from "http-errors";

import prisma from "../../prisma/client.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import { publicUserSelect } from "./auth.controller.ts";
import { getUserId } from "../middleware/authenticate.ts";
import {
  PER_PAGE,
  type AnnouncementIdParams,
  type CreateAnnouncementBody,
  type ListAnnouncementsQuery,
  type UpdateAnnouncementBody,
} from "../validators/announcements.validator.ts";

// Response shape: announcement fields + author (without password and without raw userId)
const announcementSelect = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  user: { select: publicUserSelect },
} satisfies Prisma.AnnouncementSelect;

// GET /announcements?search=&sort=newest|oldest&page=1
export const listAnnouncements: RequestHandler = async (req, res) => {
  // req.query was already parsed by validateQuery: page is a number, sort has a default
  const { search, sort, page } = req.query as unknown as ListAnnouncementsQuery;

  const where: Prisma.AnnouncementWhereInput = search
    ? { title: { contains: search, mode: "insensitive" } }
    : {};

  const direction = sort === "oldest" ? "asc" : "desc";

  const [total, data] = await prisma.$transaction([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      select: announcementSelect,
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);

  res.json({
    data,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
};

// GET /announcements/:id
export const getAnnouncementById: RequestHandler = async (req, res) => {
  const { id } = req.params as unknown as AnnouncementIdParams;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: announcementSelect,
  });

  // findUnique returns null (doesn't throw), so 404 is handled manually
  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  res.json(announcement);
};

/**
 * Ownership check: the announcement must exist (404)
 * and belong to the current user (403).
 */
async function assertOwnership(announcementId: number, userId: number) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { userId: true },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }
  if (announcement.userId !== userId) {
    throw createHttpError(403, "Access denied");
  }
}

// POST /announcements
export const createAnnouncement: RequestHandler = async (req, res) => {
  // Author comes from the access token, never from the request body
  const userId = getUserId(req);
  const data = req.body as CreateAnnouncementBody;

  const announcement = await prisma.announcement.create({
    data: { ...data, userId },
    select: announcementSelect,
  });

  res.status(201).json(announcement);
};

// PATCH /announcements/:id
export const updateAnnouncement: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params as unknown as AnnouncementIdParams;
  const data = req.body as UpdateAnnouncementBody;

  await assertOwnership(id, userId);

  // updatedAt is refreshed automatically by @updatedAt
  const announcement = await prisma.announcement.update({
    where: { id },
    data,
    select: announcementSelect,
  });

  res.json(announcement);
};

// DELETE /announcements/:id
export const deleteAnnouncement: RequestHandler = async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params as unknown as AnnouncementIdParams;

  await assertOwnership(id, userId);

  await prisma.announcement.delete({ where: { id } });

  // 204 must not have a response body
  res.status(204).end();
};
