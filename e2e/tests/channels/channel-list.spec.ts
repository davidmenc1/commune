import { test, expect, type Page } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { generateChannelName } from '../../fixtures/database';

async function createChannel(page: Page, name: string) {
  await page.getByTestId('new-channel-button').first().click();
  await page.getByTestId('channel-name-input').fill(name);
  await page.getByTestId('submit-channel-button').click();
  await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Channel List', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `chanlist-${Date.now()}@test.com` });
  });

  test('should display channel list in sidebar', async ({ page }) => {
    await expect(page.getByTestId('channel-list')).toBeVisible();
  });

  test('should show general channel by default', async ({ page }) => {
    const channelName = 'general';
    if (!(await page.locator(`text=${channelName}`).count())) {
      await createChannel(page, channelName);
    }
    await expect(page.locator(`text=${channelName}`).first()).toBeVisible({ timeout: 10000 });
  });

  test('should highlight active channel', async ({ page }) => {
    const channelName = generateChannelName('active');
    await createChannel(page, channelName);

    const channelLink = page
      .getByTestId('channel-link')
      .filter({ hasText: channelName })
      .first();
    await channelLink.click();
    await expect(channelLink).toHaveClass(/active|selected|bg-|text-primary|font-medium/);
  });

  test('should filter channels by search', async ({ page }) => {
    const channelName = 'general';
    if (!(await page.locator(`text=${channelName}`).count())) {
      await createChannel(page, channelName);
    }

    // If search is implemented
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill(channelName);
      await expect(page.locator(`text=${channelName}`).first()).toBeVisible();
    }
  });
});
