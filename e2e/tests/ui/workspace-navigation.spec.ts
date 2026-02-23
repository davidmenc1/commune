import { test, expect, type Page } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

async function createChannel(page: Page, name: string) {
  await page.getByTestId('new-channel-button').first().click();
  await page.getByTestId('channel-name-input').fill(name);
  await page.getByTestId('submit-channel-button').click();
  await expect(page.locator(`text=${name}`).first()).toBeVisible({ timeout: 10000 });
}

test.describe('Workspace Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `nav-${Date.now()}@test.com` });
  });

  test('should display workspace shell', async ({ page }) => {
    await expect(page.getByTestId('channel-list')).toBeVisible();
  });

  test('should navigate between channels', async ({ page }) => {
    const channelName = `nav-${Date.now()}`;
    await createChannel(page, channelName);

    const channelLink = page
      .getByTestId('channel-link')
      .filter({ hasText: channelName })
      .first();
    await channelLink.click();
    await expect(page).toHaveURL(/\/chat\/channels\//);
  });
});
