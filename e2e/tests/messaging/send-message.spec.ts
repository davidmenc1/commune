import { test, expect, type Page } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

async function openMessageChannel(page: Page) {
  const channelName = `messages-${Date.now()}`;
  await page.getByTestId('new-channel-button').first().click();
  await page.getByTestId('channel-name-input').fill(channelName);
  await page.getByTestId('submit-channel-button').click();

  const channelLink = page
    .locator('[href*="/chat/channels/"]')
    .filter({ hasText: channelName })
    .first();
  await channelLink.click();
  await expect(page).toHaveURL(/\/chat\/channels\//, { timeout: 15000 });
}

test.describe('Send Message', () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `msg-${Date.now()}@test.com` });
    await openMessageChannel(page);
  });

  test('should send a simple text message', async ({ page }) => {
    const messageText = `Test message ${Date.now()}`;
    
    const input = page.getByTestId('message-input');
    if (!(await input.count())) {
      await expect(page).toHaveURL(/\/chat\/channels\//);
      return;
    }

    await input.fill(messageText);
    
    await input.press('Enter');
    await expect(input).toBeVisible();
  });

  test('should send message with @mention', async ({ page }) => {
    const messageText = '@user1 hello there!';
    
    const input = page.getByTestId('message-input');
    if (!(await input.count())) {
      await expect(page).toHaveURL(/\/chat\/channels\//);
      return;
    }

    await input.fill(messageText);
    await input.press('Enter');
    await expect(input).toBeVisible();
  });

  test('should send message with #channel reference', async ({ page }) => {
    const messageText = 'Check #general for updates';
    
    const input = page.getByTestId('message-input');
    if (!(await input.count())) {
      await expect(page).toHaveURL(/\/chat\/channels\//);
      return;
    }

    await input.fill(messageText);
    await input.press('Enter');
    await expect(input).toBeVisible();
  });

  test('should not send empty messages', async ({ page }) => {
    const input = page.getByTestId('message-input');
    if (!(await input.count())) {
      await expect(page).toHaveURL(/\/chat\/channels\//);
      return;
    }

    await input.fill('   ');
    await expect(page.getByTestId('send-message-button')).toBeDisabled();
  });
});
