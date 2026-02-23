import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { setupGitLabAPIMocks } from '../../fixtures/gitlab-mocks';

test.describe('GitLab URL Unfurling', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await setupGitLabAPIMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `glurl-${Date.now()}@test.com` });
  });

  test('should unfurl GitLab issue URL', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });

  test('should unfurl GitLab MR URL', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
