FROM node:22-alpine AS base
WORKDIR /app

# Install deps for both workspaces
COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/
RUN npm install --frozen-lockfile

# Build frontend
FROM base AS frontend-build
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
COPY frontend ./frontend
RUN npm run build -w frontend

# Build backend
FROM base AS backend-build
COPY backend ./backend
RUN npm run build -w backend

# Production image
FROM node:22-alpine AS production
WORKDIR /app

COPY package.json ./
COPY backend/package.json ./backend/
RUN npm install --omit=dev --workspace=backend

COPY --from=backend-build /app/backend/dist ./backend/dist
COPY backend/drizzle ./backend/drizzle
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 3001

ENV NODE_ENV=production

CMD ["sh", "-c", "node backend/dist/db/migrate.js && node backend/dist/db/seed.js && node backend/dist/index.js"]
