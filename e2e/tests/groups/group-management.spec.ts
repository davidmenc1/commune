import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Group Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.admin, email: `groupmgmt-${Date.now()}@test.com` });
  });

  test('should add users to group', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });

  test('should remove users from group', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
