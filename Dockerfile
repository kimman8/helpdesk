FROM oven/bun:1.3

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json bun.lock ./
COPY packages/core/package.json ./packages/core/
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all dependencies (devDeps are required for Prisma generate and Vite build)
RUN bun install --frozen-lockfile

# Copy all source files
COPY packages/ ./packages/
COPY client/ ./client/
COPY server/ ./server/

# Generate Prisma client into server/src/generated/prisma
# DATABASE_URL is required by prisma.config.ts at load time but not used during generate
RUN cd server && DATABASE_URL="postgresql://dummy@localhost/dummy" ./node_modules/.bin/prisma generate

# Build the React frontend (skip tsc — type-check runs locally, not in Docker)
RUN cd client && ./node_modules/.bin/vite build

EXPOSE 3000

ENV NODE_ENV=production

# Run migrations then start the server
CMD ["sh", "-c", "cd /app/server && ./node_modules/.bin/prisma migrate deploy && bun /app/server/src/index.ts"]
