FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ libreadline-dev \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci \
  && ARCH="$(dpkg --print-architecture)" \
  && if [ "$ARCH" = "arm64" ]; then npm install --no-save @parcel/watcher-linux-arm64-glibc lightningcss-linux-arm64-gnu @next/swc-linux-arm64-gnu @tailwindcss/oxide-linux-arm64-gnu; \
     elif [ "$ARCH" = "amd64" ]; then npm install --no-save @parcel/watcher-linux-x64-glibc lightningcss-linux-x64-gnu @next/swc-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu; \
     else npm rebuild @parcel/watcher; fi

FROM deps AS build
COPY . .
RUN node ./node_modules/next/dist/bin/next build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/zero-schema.gen.ts ./zero-schema.gen.ts
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/app ./app
COPY --from=build /app/messages ./messages
COPY --from=build /app/i18n ./i18n

EXPOSE 3000
EXPOSE 4848
