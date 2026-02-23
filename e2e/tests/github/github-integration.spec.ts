import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { setupGitHubOAuthMocks, setupGitHubAPIMocks } from '../../fixtures/github-mocks';

test.describe('GitHub Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await setupGitHubOAuthMocks(page);
    await setupGitHubAPIMocks(page);
    await registerUser(page, { ...TEST_USERS.admin, email: `github-${Date.now()}@test.com` });
  });

  test('should connect GitHub repository', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
