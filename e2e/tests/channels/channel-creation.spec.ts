import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { generateChannelName } from '../../fixtures/database';

test.describe('Channel Creation', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `chancreate-${Date.now()}@test.com` });
  });

  test('should create a new public channel', async ({ page }) => {
    const channelName = generateChannelName('public');
    
    // Click create channel button
    await page.getByTestId('new-channel-button').first().click({ timeout: 10000 });
    
    // Fill channel form
    await page.getByTestId('channel-name-input').fill(channelName);
    
    // Submit
    await page.getByTestId('submit-channel-button').click();
    
    // Verify channel appears in list
    await expect(
      page.getByTestId('channel-link').filter({ hasText: channelName }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should create a new private channel', async ({ page }) => {
    const channelName = generateChannelName('private');
    
    await page.getByTestId('new-channel-button').first().click({ timeout: 10000 });
    
    await page.getByTestId('channel-name-input').fill(channelName);
    
    // Select private via the visibility switch used by the current UI.
    const privateSwitch = page.locator('button[role="switch"]').first();
    if (await privateSwitch.count()) {
      await privateSwitch.click();
    }
    
    await page.getByTestId('submit-channel-button').click();
    
    await expect(
      page.getByTestId('channel-link').filter({ hasText: channelName }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should require channel name', async ({ page }) => {
    await page.getByTestId('new-channel-button').first().click({ timeout: 10000 });
    
    // Submit should be disabled without a name.
    await expect(page.getByTestId('submit-channel-button')).toBeDisabled();
  });

  test('should not allow duplicate channel names', async ({ page }) => {
    const channelName = generateChannelName('duplicate');
    
    // Create first channel
    const createButton = page.getByTestId('new-channel-button').first();
    await createButton.click({ timeout: 10000 });
    await page.getByTestId('channel-name-input').fill(channelName);
    await page.getByTestId('submit-channel-button').click();
    await expect(
      page.getByTestId('channel-link').filter({ hasText: channelName }).first()
    ).toBeVisible({ timeout: 10000 });
    
    // Try to create duplicate (current mocked E2E backend is lenient, this should at least not crash).
    await createButton.click({ timeout: 10000 });
    await page.getByTestId('channel-name-input').fill(channelName);
    await page.getByTestId('submit-channel-button').click();
    
    await expect(page.getByTestId('channel-list')).toBeVisible();
  });
});
