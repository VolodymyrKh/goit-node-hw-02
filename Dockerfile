# Debian slim: prebuilt bcrypt and Prisma binaries work as is
FROM node:22-slim

# Required by prisma migrate
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN chown node:node /app
USER node

# Dev deps are needed at runtime (tsx, prisma CLI)
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY --chown=node:node . .
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run with an init process (compose: init: true) so SIGTERM reaches node
CMD ["sh", "-c", "npx prisma migrate deploy && exec node --import tsx app.ts"]
