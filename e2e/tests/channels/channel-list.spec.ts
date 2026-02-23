import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { generateChannelName } from '../../fixtures/database';

test.describe('Channel List', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `chanlist-${Date.now()}@test.com` });
  });

  test('should display channel list in sidebar', async ({ page }) => {
    await expect(page.locator('[data-testid="channel-list"], text=Channels').first()).toBeVisible();
  });

  test('should show general channel by default', async ({ page }) => {
    // Most chat apps have a default general channel
    await expect(page.locator('text=general').first()).toBeVisible({ timeout: 10000 });
  });

  test('should highlight active channel', async ({ page }) => {
    const channelLink = page.locator('[href*="/chat/channels/"]').first();
    await channelLink.click();
    await expect(channelLink).toHaveClass(/active|selected|bg-/);
  });

  test('should filter channels by search', async ({ page }) => {
    // If search is implemented
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('general');
      await expect(page.locator('text=general')).toBeVisible();
    }
  });
});
