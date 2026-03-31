/**
 * Global Setup for E2E Tests
 * 
 * This runs once before all tests to:
 * 1. Initialize the better-auth test database
 * 2. Run any necessary migrations
 * 3. Set up the test environment
 */

import Database from "better-sqlite3";
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load test environment variables
dotenv.config({ path: '.env.test' });

async function globalSetup() {
  console.log('🔧 Running global E2E test setup...\n');

  const authDbPath = process.env.BETTER_AUTH_DB || './better-auth-test.db';
  
  // Remove existing test database if it exists
  if (fs.existsSync(authDbPath)) {
    console.log('🗑️  Removing existing test database...');
    fs.unlinkSync(authDbPath);
  }

  console.log(`🆕 Creating fresh better-auth database at: ${authDbPath}`);
  
  // Initialize better-auth with the test database
  const db = new Database(authDbPath);
  
  // Create better-auth tables manually
  // These are the tables that better-auth creates automatically
  console.log('📋 Creating better-auth schema...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS "user" (
      "id" text not null primary key, 
      "name" text not null, 
      "email" text not null unique, 
      "emailVerified" integer not null, 
      "image" text, 
      "createdAt" date not null, 
      "updatedAt" date not null
    );
    
    CREATE TABLE IF NOT EXISTS "session" (
      "id" text not null primary key, 
      "expiresAt" date not null, 
      "token" text not null unique, 
      "createdAt" date not null, 
      "updatedAt" date not null, 
      "ipAddress" text, 
      "userAgent" text, 
      "userId" text not null references "user" ("id") on delete cascade
    );
    
    CREATE TABLE IF NOT EXISTS "account" (
      "id" text not null primary key, 
      "accountId" text not null, 
      "providerId" text not null, 
      "userId" text not null references "user" ("id") on delete cascade, 
      "accessToken" text, 
      "refreshToken" text, 
      "idToken" text, 
      "accessTokenExpiresAt" date, 
      "refreshTokenExpiresAt" date, 
      "scope" text, 
      "password" text, 
      "createdAt" date not null, 
      "updatedAt" date not null
    );
    
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" text not null primary key, 
      "identifier" text not null, 
      "value" text not null, 
      "expiresAt" date not null, 
      "createdAt" date not null, 
      "updatedAt" date not null
    );
    
    CREATE TABLE IF NOT EXISTS "jwks" (
      "id" text not null primary key, 
      "publicKey" text not null, 
      "privateKey" text not null, 
      "createdAt" date not null
    );
  `);
  
  console.log('✅ Better-auth schema created successfully\n');

  // Clean up Zero replica file if it exists
  const zeroReplicaFile = process.env.ZERO_REPLICA_FILE || '/tmp/sync-replica-test.db';
  if (fs.existsSync(zeroReplicaFile)) {
    console.log('🗑️  Removing existing Zero replica database...');
    fs.unlinkSync(zeroReplicaFile);
  }

  console.log('🎉 Global setup complete!\n');
  
  // Close the database connection
  db.close();
}

export default globalSetup;
