#!/usr/bin/env tsx
/**
 * Test Database Setup Script
 *
 * This script sets up a clean test database for E2E testing.
 * Run this before executing tests to ensure a fresh database state.
 *
 * Usage: npm run test:e2e:setup
 */

import * as dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import postgres from 'postgres';

// Load defaults from .env.test, but allow shell/CI environment variables to override.
dotenv.config({ path: '.env.test' });

const TEST_DB_URL_RAW = process.env.ZERO_UPSTREAM_DB;
const MIGRATION_TABLE = '__drizzle_migrations';

if (!TEST_DB_URL_RAW) {
  console.error('ERROR: ZERO_UPSTREAM_DB environment variable is not set.');
  console.error('Set it in .env.test or pass it via shell/CI environment.');
  process.exit(1);
}
const TEST_DB_URL = TEST_DB_URL_RAW;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function truncateAllPublicTables(client: postgres.Sql) {
  const tables = await client<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> ${MIGRATION_TABLE}
    ORDER BY tablename;
  `;

  if (tables.length === 0) {
    console.log('No public tables found to truncate.');
    return;
  }

  const qualifiedTableList = tables
    .map(({ tablename }) => `public.${quoteIdentifier(tablename)}`)
    .join(', ');

  await client.unsafe(
    `TRUNCATE TABLE ${qualifiedTableList} RESTART IDENTITY CASCADE;`,
  );

  console.log(`Truncated ${tables.length} table(s) in public schema.`);
}

async function setupTestDatabase() {
  console.log('Setting up test database...');

  try {
    const parsedUrl = new URL(TEST_DB_URL);
    console.log(`Target: ${parsedUrl.hostname}/${parsedUrl.pathname.replace('/', '')}`);

    console.log('Running Drizzle migrations...');
    execSync('npx drizzle-kit migrate', {
      stdio: 'inherit',
      env: process.env,
    });

    const testClient = postgres(TEST_DB_URL, {
      max: 1,
      prepare: false,
    });

    try {
      console.log('Clearing existing test data (schema preserved)...');
      await truncateAllPublicTables(testClient);
    } finally {
      await testClient.end();
    }

    console.log('Test database setup complete.');
    console.log('You can now run: npm run test:e2e');
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

// Run setup
setupTestDatabase().catch(console.error);
