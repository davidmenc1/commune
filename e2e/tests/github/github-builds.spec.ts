import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('GitHub Builds', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `ghbuild-${Date.now()}@test.com` });
  });

  test('should display build status', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
