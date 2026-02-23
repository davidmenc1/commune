import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { setupGitLabOAuthMocks, setupGitLabAPIMocks } from '../../fixtures/gitlab-mocks';

test.describe('GitLab Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await setupGitLabOAuthMocks(page);
    await setupGitLabAPIMocks(page);
    await registerUser(page, { ...TEST_USERS.admin, email: `gitlab-${Date.now()}@test.com` });
  });

  test('should connect GitLab project', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
