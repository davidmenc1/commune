import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('User Mentions', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `mention-${Date.now()}@test.com` });
  });

  test('should create user mention', async ({ page }) => {
    await page.goto('/chat/channels');
    const input = page.locator('textarea, input').first();
    await input.fill('@user');
    await page.waitForTimeout(500);
  });
});
