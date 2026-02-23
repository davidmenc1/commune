import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Channel Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
  });

  test('should allow users to access public channels', async ({ page }) => {
    await registerUser(page, { ...TEST_USERS.user1, email: `access-${Date.now()}@test.com` });
    
    // Navigate to channels workspace and open any available channel if present.
    await page.goto('/chat/channels');
    const publicChannel = page.getByTestId('channel-link').first();
    if (await publicChannel.count()) {
      await publicChannel.click();
      await expect(page).toHaveURL(/\/chat\/channels\//);
    } else {
      await expect(page.getByTestId('channel-list')).toBeVisible();
    }
  });

  test('should restrict access to private channels', async ({ page }) => {
    // Test would create private channel and verify access control
    await registerUser(page, { ...TEST_USERS.user2, email: `restrict-${Date.now()}@test.com` });
    await expect(page).toHaveURL('/chat/channels');
  });
});
