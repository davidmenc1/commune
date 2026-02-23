import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Workspace Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `nav-${Date.now()}@test.com` });
  });

  test('should display workspace shell', async ({ page }) => {
    await expect(page.locator('text=Channels').first()).toBeVisible();
  });

  test('should navigate between channels', async ({ page }) => {
    const channelLinks = page.locator('[href*="/chat/channels/"]');
    if (await channelLinks.count() > 0) {
      await channelLinks.first().click();
      await expect(page).toHaveURL(/\/chat\/channels\//);
    }
  });
});
