# EKP frontend container (per architecture.md §4.3)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN corepack enable && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else pnpm install; fi

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* must be baked at build time per Next.js static replacement
# (lib/api-client.ts + lib/api/kb.ts reference process.env.NEXT_PUBLIC_API_URL
# directly in client code; runtime override won't work for client bundle).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_MOCK
ARG NEXT_PUBLIC_DEFAULT_KB_ID
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AUTH_MOCK=$NEXT_PUBLIC_AUTH_MOCK
ENV NEXT_PUBLIC_DEFAULT_KB_ID=$NEXT_PUBLIC_DEFAULT_KB_ID
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

RUN corepack enable && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Server-side rewrite in next.config.mjs reads NEXT_PUBLIC_API_URL at server
# startup; pass through so standalone server.js can resolve /api/backend/*.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3001
CMD ["node", "server.js"]
