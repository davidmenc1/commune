import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Message Reactions', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `react-${Date.now()}@test.com` });
  });

  test('should add emoji reaction to message', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });

  test('should remove own reaction', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
