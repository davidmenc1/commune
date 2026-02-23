import { test, expect } from '@playwright/test';
import { loginUser, registerUser, TEST_USERS, type TestUser } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

let sharedTestUser: TestUser;

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mocks before each test
    await setupZeroMocks(page);
    
    // Create a test user to login with
    const testUser = {
      ...TEST_USERS.user1,
      email: `login-test-${Date.now()}@example.com`,
    };
    
    // Store user for later use in tests
    sharedTestUser = testUser;
    
    // Register the user first
    await registerUser(page, testUser);
    
    // Logout to prepare for login test
    await page.goto('/auth/logout');
  });

  test('should login with valid credentials', async ({ page }) => {
    const testUser = sharedTestUser;
    
    // Navigate to login page
    await page.goto('/auth/login');
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to traffic page after successful login
    await expect(page).toHaveURL('/chat/traffic', { timeout: 10000 });
    
    // Verify user is authenticated by checking we're on an authenticated route
    await expect(page).toHaveURL(/\/chat\//);
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill form with non-existent email
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'SomePassword123!');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should stay on login page or show error
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should show error for incorrect password', async ({ page }) => {
    const testUser = sharedTestUser;
    
    await page.goto('/auth/login');
    
    // Fill form with correct email but wrong password
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', 'WrongPassword123!');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should stay on login page or show error
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should require both email and password', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try to submit without filling fields
    await page.click('button[type="submit"]');
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should redirect authenticated users away from login page', async ({ page }) => {
    const testUser = sharedTestUser;
    
    // Login first
    await loginUser(page, testUser);
    
    // Try to navigate to login page
    await page.goto('/auth/login');
    
    // Should redirect to channels page (or stay if already there)
    await expect(page).toHaveURL(/\/chat/);
  });

  test('should have a link to registration page', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Look for register link
    const registerLink = page.locator('a[href*="/auth/register"]');
    await expect(registerLink).toBeVisible();
    
    // Click and verify navigation
    await registerLink.click();
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should persist session after page reload', async ({ page }) => {
    const testUser = sharedTestUser;
    
    // Login
    await loginUser(page, testUser);
    
    // Reload page
    await page.reload();
    
    // Should still be authenticated
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.locator('text=Channels').first()).toBeVisible();
  });
});
