# Test Database Setup Guide

This guide will help you create and configure the test database for E2E testing.

## Prerequisites

### 1. PostgreSQL Installed

You need PostgreSQL running on your machine.

**Check if PostgreSQL is installed:**
```bash
psql --version
```

**If not installed, install it:**

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

**Docker (any OS):**
```bash
docker run -d \
  --name postgres-test \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15
```

### 2. Verify PostgreSQL is Running

```bash
pg_isready -h localhost -p 5432 -U postgres
```

You should see: `localhost:5432 - accepting connections`

## Creating the Test Database

### Method 1: Automated Script (Recommended)

Run this command to create the database automatically:

```bash
npm run test:e2e:db:create
```

This will:
- ✅ Check PostgreSQL is running
- ✅ Drop existing `chat-app-test` database
- ✅ Create fresh `chat-app-test` database

### Method 2: Using PostgreSQL Command Line

If the automated script doesn't work, create it manually:

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U postgres

# In the PostgreSQL prompt:
DROP DATABASE IF EXISTS "chat-app-test";
CREATE DATABASE "chat-app-test";

# Verify it was created:
\l

# Exit:
\q
```

### Method 3: Using a GUI Tool

If you prefer a GUI:

**pgAdmin:**
1. Right-click "Databases"
2. Create → Database
3. Name: `chat-app-test`
4. Click Save

**TablePlus / Postico / DBeaver:**
1. Connect to PostgreSQL server
2. Create new database: `chat-app-test`

## Verify Database Configuration

Check that `.env.test` has the correct connection string:

```bash
cat .env.test | grep ZERO_UPSTREAM_DB
```

Should show:
```
ZERO_UPSTREAM_DB=postgresql://postgres:postgres@localhost:5432/chat-app-test
```

**Important:** Make sure credentials match your PostgreSQL setup:
- User: `postgres` (or your PostgreSQL username)
- Password: `postgres` (or your PostgreSQL password)
- Host: `localhost`
- Port: `5432`
- Database: `chat-app-test`

## Running the Full Setup

After creating the database, run the full setup script:

```bash
npm run test:e2e:setup
```

This will initialize the database schema and prepare it for tests.

## Troubleshooting

### Error: "PostgreSQL is not running"

**Check if running:**
```bash
pg_isready
```

**Start PostgreSQL:**
```bash
# macOS (Homebrew)
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Docker
docker start postgres-test
```

### Error: "password authentication failed"

Your PostgreSQL password is different. Update `.env.test`:

```bash
# Find your PostgreSQL password
# Option 1: Check environment variables
echo $PGPASSWORD

# Option 2: Check PostgreSQL config
cat ~/.pgpass

# Then update .env.test with correct credentials
```

### Error: "permission denied to create database"

Your user doesn't have CREATE DATABASE permission:

```bash
# Connect as superuser
psql -U postgres

# Grant permission
ALTER USER your_username CREATEDB;
```

### Error: "connection refused"

PostgreSQL is not running or using different port:

```bash
# Check what's running on port 5432
lsof -i :5432

# If using different port, update .env.test
```

### Error: "database already exists"

Drop it first:

```bash
psql -U postgres -c "DROP DATABASE \"chat-app-test\";"
# Then recreate
psql -U postgres -c "CREATE DATABASE \"chat-app-test\";"
```

## Testing the Connection

Verify you can connect to the test database:

```bash
psql postgresql://postgres:postgres@localhost:5432/chat-app-test
```

If successful, you'll see:
```
psql (15.x)
Type "help" for help.

chat-app-test=#
```

Exit with `\q`

## Running Tests

Once the database is created and set up:

```bash
# Run all tests
npm run test:e2e

# Or run with UI
npm run test:e2e:ui
```

## Database Schema

The test database will automatically get the same schema as your development database when you run:

```bash
npm run test:e2e:setup
```

This runs migrations and creates all necessary tables.

## Resetting the Test Database

To get a completely fresh test database:

```bash
# Drop and recreate
npm run test:e2e:db:create

# Then reinitialize
npm run test:e2e:setup
```

## Using Docker for PostgreSQL

If you want an isolated PostgreSQL instance just for testing:

```bash
# Create a dedicated test database container
docker run -d \
  --name chat-app-test-db \
  -p 5433:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=chat-app-test \
  postgres:15

# Update .env.test to use port 5433
ZERO_UPSTREAM_DB=postgresql://postgres:postgres@localhost:5433/chat-app-test
```

## Quick Reference

```bash
# Create test database
npm run test:e2e:db:create

# Initialize/setup database
npm run test:e2e:setup

# Verify connection
psql postgresql://postgres:postgres@localhost:5432/chat-app-test

# Run tests
npm run test:e2e
```

## Next Steps

After setting up the database:
1. ✅ Run `npm run test:e2e:setup` to initialize schema
2. ✅ Run `npm run test:e2e:ui` to verify tests work
3. ✅ Start developing with confidence!

---

**Need Help?**
- Check PostgreSQL logs: `tail -f /usr/local/var/log/postgresql@15.log` (macOS)
- Check PostgreSQL status: `brew services list` (macOS)
- PostgreSQL docs: https://www.postgresql.org/docs/
