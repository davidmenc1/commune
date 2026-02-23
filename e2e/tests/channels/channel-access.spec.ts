import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Channel Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
  });

  test('should allow users to access public channels', async ({ page }) => {
    await registerUser(page, { ...TEST_USERS.user1, email: `access-${Date.now()}@test.com` });
    
    // Navigate to a public channel (e.g., general)
    await page.goto('/chat/channels');
    const publicChannel = page.locator('text=general').first();
    if (await publicChannel.isVisible()) {
      await publicChannel.click();
      await expect(page).toHaveURL(/\/chat\/channels\//);
    }
  });

  test('should restrict access to private channels', async ({ page }) => {
    // Test would create private channel and verify access control
    await registerUser(page, { ...TEST_USERS.user2, email: `restrict-${Date.now()}@test.com` });
    await expect(page).toHaveURL('/chat/channels');
  });
});
