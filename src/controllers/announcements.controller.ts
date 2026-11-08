import type { RequestHandler } from "express";
import createHttpError from "http-errors";

import prisma from "../../prisma/client.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import { publicUserSelect } from "./auth.controller.ts";
import {
  PER_PAGE,
  type AnnouncementIdParams,
  type ListAnnouncementsQuery,
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
