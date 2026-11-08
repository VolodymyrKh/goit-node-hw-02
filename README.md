# Announcements Board REST API

JSON API for an announcements board: users register, log in and manage their own announcements; guests can browse them.

**Stack:** Node.js, Express 5, TypeScript (tsx), Prisma 7 + PostgreSQL, Zod, JWT, bcrypt, OpenAPI (Swagger UI), Docker.

## Run with Docker

```bash
cp .env.example .env     # set JWT_SECRET
docker compose up -d --build
```

API and docs: http://localhost:3000/api-docs. Migrations are applied on container start.

```bash
docker compose logs -f api   # logs
docker compose down          # stop (data kept in the pgdata volume)
docker compose down -v       # stop and delete data
```

## Run locally

Requires Node.js 20.19+ and PostgreSQL.

```bash
npm install
cp .env.example .env         # set DATABASE_URL and JWT_SECRET
npm run prisma:migrate
npm run dev
```

## Environment

| Variable       | Description                                 |
| -------------- | ------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                |
| `JWT_SECRET`   | Secret for signing tokens                   |
| `PORT`         | Server port (default `3000`)                |
| `API_PORT`     | Host port in Docker Compose (default `3000`) |

## Endpoints

| Method | Path                 | Auth | Description                             |
| ------ | -------------------- | ---- | --------------------------------------- |
| POST   | `/auth/register`     |      | Register, returns user and token pair   |
| POST   | `/auth/login`        |      | Log in, returns user and token pair     |
| POST   | `/auth/refresh`      |      | Exchange refresh token for a new pair   |
| POST   | `/auth/logout`       | ✓    | Revoke the user's refresh token         |
| GET    | `/auth/me`           | ✓    | Current user profile                    |
| GET    | `/announcements`     |      | List: `search`, `sort=newest\|oldest`, `page` |
| GET    | `/announcements/:id` |      | Announcement with author                |
| POST   | `/announcements`     | ✓    | Create                                  |
| PATCH  | `/announcements/:id` | ✓    | Partial update, owner only              |
| DELETE | `/announcements/:id` | ✓    | Delete, owner only                      |

Protected routes expect `Authorization: Bearer <accessToken>`.

## Validation

| Field         | Rules                                  |
| ------------- | -------------------------------------- |
| `username`    | string, 3–30 chars                     |
| `email`       | valid email                            |
| `password`    | string, min 6 chars                    |
| `name`        | string, min 2 chars                    |
| `title`       | string, 5–50 chars                     |
| `description` | string, min 10 chars                   |
| `price`       | number > 0                             |
| `category`    | `sale`, `service`, `job` or `other`    |

PATCH accepts any subset of announcement fields, but not an empty body. Errors return `400` with `{ error, details: { body | params | query: [...] } }`.

## Implementation notes

- **Tokens:** access token lives 15 min, refresh token 7 days. Both carry a `type` claim, so a refresh token can't be used as an access token.
- **Refresh tokens:** stored in the DB, rotated on every refresh. Login replaces the old token, logout deletes it.
- **Login:** unknown username and wrong password both return `401 Invalid credentials`, and both take the same time.
- **Ownership:** PATCH and DELETE return `403 Access denied` for someone else's announcement and `404` for a missing one.
- **Pagination:** 10 items per page; `count()` uses the same filter as `findMany()`.
- **Passwords:** stored as bcrypt hashes and never returned.

## Project structure

```
prisma/              schema, migrations, Prisma client
src/
  controllers/       auth and announcements handlers
  middleware/        authenticate, validate (body / params / query)
  routes/            routers and OpenAPI path registration
  validators/        Zod request and response schemas
  openapi.ts         OpenAPI registry and bearerAuth scheme
app.ts               Express app entry point
Dockerfile           API image
docker-compose.yml   API + PostgreSQL
```

## Scripts

| Command                   | Description                   |
| ------------------------- | ----------------------------- |
| `npm run dev`             | Start with watch mode         |
| `npm start`               | Start                         |
| `npm run prisma:migrate`  | Create and apply migrations   |
| `npm run prisma:generate` | Generate Prisma Client        |
