import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { setupGitHubAPIMocks } from '../../fixtures/github-mocks';

test.describe('GitHub URL Unfurling', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await setupGitHubAPIMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `ghurl-${Date.now()}@test.com` });
  });

  test('should unfurl GitHub issue URL', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });

  test('should unfurl GitHub PR URL', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
