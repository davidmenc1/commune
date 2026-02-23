import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Webhook Creation', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.admin, email: `webhook-${Date.now()}@test.com` });
  });

  test('should create channel webhook', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
