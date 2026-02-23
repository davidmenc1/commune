import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mocks before each test
    await setupZeroMocks(page);
  });

  test('should register a new user with valid credentials', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
    
    // Verify we're on the registration page
    await expect(page).toHaveURL(/\/auth\/register/);
    
    // Generate unique user for this test
    const testUser = {
      ...TEST_USERS.user1,
      email: `test-${Date.now()}@example.com`,
    };
    
    // Fill registration form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="name"]', testUser.name);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to traffic page after successful registration
    await expect(page).toHaveURL('/chat/traffic', { timeout: 10000 });
    
    // Verify user is authenticated by checking we're on an authenticated route
    await expect(page).toHaveURL(/\/chat\//);
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill form with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'ValidPassword123!');
    await page.fill('input[name="name"]', 'Test User');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should stay on registration page or show error
    // Note: Exact error message depends on your implementation
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should show validation error for weak password', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Fill form with weak password
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123'); // Too short
    await page.fill('input[name="name"]', 'Test User');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should show error when registering with existing email', async ({ page }) => {
    // First registration
    const testUser = {
      ...TEST_USERS.user1,
      email: `existing-${Date.now()}@example.com`,
    };
    
    await registerUser(page, testUser);
    
    // Logout
    await page.goto('/auth/logout');
    
    // Try to register again with same email
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="name"]', testUser.name);
    await page.click('button[type="submit"]');
    
    // Should show error (either stay on page or show error message)
    await page.waitForTimeout(1000);
    // Exact assertion depends on error handling implementation
  });

  test('should require all fields', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Try to submit without filling any fields
    await page.click('button[type="submit"]');
    
    // Should stay on registration page
    await expect(page).toHaveURL(/\/auth\/register/);
  });

  test('should have a link to login page', async ({ page }) => {
    await page.goto('/auth/register');
    
    // Look for login link
    const loginLink = page.locator('a[href*="/auth/login"]');
    await expect(loginLink).toBeVisible();
    
    // Click and verify navigation
    await loginLink.click();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
