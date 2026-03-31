# Test Database Quick Reference

## Three Simple Steps

```bash
# Step 1: Create the database
npm run test:e2e:db:create

# Step 2: Initialize schema
npm run test:e2e:setup

# Step 3: Run tests
npm run test:e2e:ui
```

## What Gets Created

**Database Name:** `chat-app-test`

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/chat-app-test
```

## Prerequisites Check

```bash
# Is PostgreSQL installed?
psql --version

# Is PostgreSQL running?
pg_isready -h localhost -p 5432 -U postgres
```

## If PostgreSQL Not Installed

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Docker:**
```bash
docker run -d --name postgres-test \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15
```

## Manual Database Creation

```bash
# Option 1: One-liner
psql -U postgres -c "CREATE DATABASE \"chat-app-test\";"

# Option 2: Interactive
psql -U postgres
postgres=# CREATE DATABASE "chat-app-test";
postgres=# \q
```

## Verify It Works

```bash
# Can you connect?
psql postgresql://postgres:postgres@localhost:5432/chat-app-test

# If yes, exit with:
\q
```

## Common Issues

| Error | Solution |
|-------|----------|
| `connection refused` | PostgreSQL not running → start it |
| `password authentication failed` | Update password in `.env.test` |
| `permission denied` | User needs CREATE DATABASE permission |
| `database already exists` | Drop it first: `DROP DATABASE "chat-app-test";` |

## Different PostgreSQL Credentials?

Edit `.env.test` and update:
```env
ZERO_UPSTREAM_DB=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/chat-app-test
```

## Reset Everything

```bash
# Drop database
psql -U postgres -c 'DROP DATABASE "chat-app-test";'

# Recreate from scratch
npm run test:e2e:db:create
npm run test:e2e:setup
```

## Full Documentation

See `e2e/DATABASE-SETUP.md` for complete troubleshooting guide.
