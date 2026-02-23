/**
 * Authentication Fixtures
 * 
 * Provides helper functions and test users for authentication testing.
 * Includes methods to create test users, login, and manage auth state.
 */

import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role?: 'user' | 'admin' | 'owner';
}

// Pre-defined test users for consistent testing
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'TestPassword123!',
    name: 'Admin User',
    role: 'admin' as const,
  },
  user1: {
    email: 'user1@test.com',
    password: 'TestPassword123!',
    name: 'Test User 1',
    role: 'user' as const,
  },
  user2: {
    email: 'user2@test.com',
    password: 'TestPassword123!',
    name: 'Test User 2',
    role: 'user' as const,
  },
  user3: {
    email: 'user3@test.com',
    password: 'TestPassword123!',
    name: 'Test User 3',
    role: 'user' as const,
  },
};

/**
 * Register a new user via the registration page
 */
export async function registerUser(page: Page, user: TestUser) {
  await page.goto('/auth/register');
  
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="name"]', user.name);
  
  await page.click('button[type="submit"]');
  
  // Wait for redirect after successful registration
  // The app redirects to /chat/traffic after registration
  await page.waitForURL('/chat/traffic', { timeout: 10000 });
}

/**
 * Login a user via the login page
 */
export async function loginUser(page: Page, user: TestUser) {
  await page.goto('/auth/login');
  
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  await page.click('button[type="submit"]');
  
  // Wait for redirect after successful login
  // The app redirects to /chat/traffic after login
  await page.waitForURL('/chat/traffic', { timeout: 10000 });
}

/**
 * Logout the current user
 */
export async function logoutUser(page: Page) {
  // Click on user menu/dropdown (adjust selector based on your UI)
  await page.click('[data-testid="user-menu"]', { timeout: 5000 }).catch(() => {
    // Fallback: try alternative selector
    return page.click('button:has-text("Logout")', { timeout: 5000 }).catch(() => {
      // If no logout button visible, navigate to logout endpoint
      return page.goto('/auth/logout');
    });
  });
  
  // Wait for redirect to login page
  await page.waitForURL('/auth/login', { timeout: 10000 });
}

/**
 * Save authentication state to file for reuse across tests
 */
export async function saveAuthState(page: Page, filename: string) {
  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  
  // Ensure .auth directory exists
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  const authFile = path.join(authDir, filename);
  await page.context().storageState({ path: authFile });
  
  return authFile;
}

/**
 * Check if user is authenticated by verifying we're on a protected page
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const url = page.url();
  return !url.includes('/auth/login') && !url.includes('/auth/register');
}

/**
 * Ensure user is authenticated, redirect to login if not
 */
export async function requireAuth(page: Page, user: TestUser) {
  if (!(await isAuthenticated(page))) {
    await loginUser(page, user);
  }
}

/**
 * Create a fresh auth state for a specific user
 * This is useful for setup scripts that run before tests
 */
export async function createAuthStateForUser(page: Page, user: TestUser, stateFile: string) {
  // Register or login the user
  await page.goto('/auth/register');
  
  // Try to register, if fails (user exists), login instead
  await page.fill('input[name="email"]', user.email).catch(() => {});
  await page.fill('input[name="password"]', user.password).catch(() => {});
  await page.fill('input[name="name"]', user.name).catch(() => {});
  
  await page.click('button[type="submit"]').catch(() => {});
  
  // If registration failed, try login
  const currentUrl = page.url();
  if (currentUrl.includes('/auth/register')) {
    await loginUser(page, user);
  }
  
  // Wait for successful authentication
  await page.waitForURL('/chat/channels', { timeout: 10000 });
  
  // Save auth state
  await saveAuthState(page, stateFile);
}

/**
 * Mock Better Auth JWT for API testing
 * Returns a mock JWT token structure
 */
export function createMockJWT(userId: string, email: string): string {
  // In real tests, this would create a valid JWT
  // For now, return a placeholder that matches the expected format
  const payload = {
    sub: userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };
  
  // Base64 encode (simplified - real JWT has 3 parts)
  return `mock.${Buffer.from(JSON.stringify(payload)).toString('base64')}.signature`;
}
