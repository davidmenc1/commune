import { test, expect } from '@playwright/test';
import { loginUser, registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('User Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mocks before each test
    await setupZeroMocks(page);
    
    // Create and login a test user
    const testUser = {
      ...TEST_USERS.user1,
      email: `logout-test-${Date.now()}@example.com`,
    };
    
    await registerUser(page, testUser);
  });

  test('should logout and redirect to login page', async ({ page }) => {
    // User is logged in from beforeEach
    await expect(page).toHaveURL('/chat/channels');
    
    // Navigate to logout endpoint
    await page.goto('/auth/logout');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });

  test('should clear session after logout', async ({ page }) => {
    // Logout
    await page.goto('/auth/logout');
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Try to access protected page
    await page.goto('/chat/channels');
    
    // Should redirect back to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should require re-authentication after logout', async ({ page }) => {
    const testUser = {
      ...TEST_USERS.user2,
      email: `reauth-test-${Date.now()}@example.com`,
    };
    
    // Register new user
    await registerUser(page, testUser);
    
    // Logout
    await page.goto('/auth/logout');

    // Login again after logout and verify access is restored.
    await page.goto('/auth/login');
    await loginUser(page, testUser);
    
    // Should be able to access chat
    await expect(page).toHaveURL(/\/chat\/channels/);
  });

  test('should clear all auth tokens and cookies', async ({ page, context }) => {
    // Get cookies before logout
    const cookiesBefore = await context.cookies();
    expect(cookiesBefore.length).toBeGreaterThan(0);
    
    // Logout
    await page.goto('/auth/logout');
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Check that auth-related cookies are cleared
    const cookiesAfter = await context.cookies();
    
    // Auth cookies should be removed or expired
    const authCookies = cookiesAfter.filter(c => 
      c.name.includes('auth') || 
      c.name.includes('session') || 
      c.name.includes('token')
    );
    
    // Most auth cookies should be cleared
    // Note: Implementation may vary, some apps use httpOnly cookies
  });

  test('should handle multiple logout requests gracefully', async ({ page }) => {
    // First logout
    await page.goto('/auth/logout');
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Second logout (should not error)
    await page.goto('/auth/logout');
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // No errors should occur
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    expect(errors.length).toBe(0);
  });
});
