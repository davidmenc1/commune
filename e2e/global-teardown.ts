/**
 * Global Teardown for E2E Tests
 * 
 * This runs once after all tests to clean up:
 * 1. Close database connections
 * 2. Optionally remove test databases (commented out to preserve for debugging)
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load test environment variables
dotenv.config({ path: '.env.test' });

async function globalTeardown() {
  console.log('🧹 Running global E2E test teardown...\n');

  const authDbPath = process.env.BETTER_AUTH_DB || './better-auth-test.db';
  const zeroReplicaFile = process.env.ZERO_REPLICA_FILE || '/tmp/sync-replica-test.db';

  // Optionally clean up test databases
  // Commented out to preserve test databases for debugging
  // Uncomment these lines if you want to clean up after every test run
  
  // if (fs.existsSync(authDbPath)) {
  //   console.log('🗑️  Removing test auth database...');
  //   fs.unlinkSync(authDbPath);
  // }

  // if (fs.existsSync(zeroReplicaFile)) {
  //   console.log('🗑️  Removing test replica database...');
  //   fs.unlinkSync(zeroReplicaFile);
  // }

  console.log('✅ Global teardown complete!\n');
}

export default globalTeardown;
