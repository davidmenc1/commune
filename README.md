# Commune

### Instalace

```bash
# 1. Clone repository
git clone <repository-url>
cd chat-app

# 2. Instalace závislostí
bun install

# 3. Start PostgreSQL (Docker)
docker-compose up -d postgres
# NEBO použij existující PostgreSQL

# 4. Konfigurace (.env.local)
DATABASE_URL=postgresql://user:password@localhost:5432/chatapp
ZERO_UPSTREAM_DB=postgresql://user:password@localhost:5432/chatapp

# 5. Databázové migrace
bunx drizzle-kit generate
bunx drizzle-kit migrate

# 6. Start Zero cache (v samostatném terminálu)
bun run cache

# 7. Start development server
bun run dev
```

Aplikace běží na **http://localhost:3000**
