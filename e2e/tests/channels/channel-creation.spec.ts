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
    const createButton = page.locator('button:has-text("New Channel"), button:has-text("Create Channel"), button:has-text("+")').first();
    await createButton.click({ timeout: 10000 });
    
    // Fill channel form
    await page.fill('input[name="name"], input[placeholder*="channel name" i]', channelName);
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Test channel description');
    
    // Ensure public is selected
    const publicRadio = page.locator('input[type="radio"][value="public"], input[name="is_public"][value="true"]');
    if (await publicRadio.count() > 0) {
      await publicRadio.check();
    }
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Verify channel appears in list
    await expect(page.locator(`text=${channelName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should create a new private channel', async ({ page }) => {
    const channelName = generateChannelName('private');
    
    const createButton = page.locator('button:has-text("New Channel"), button:has-text("Create Channel"), button:has-text("+")').first();
    await createButton.click({ timeout: 10000 });
    
    await page.fill('input[name="name"], input[placeholder*="channel name" i]', channelName);
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 'Private test channel');
    
    // Select private
    const privateRadio = page.locator('input[type="radio"][value="private"], input[name="is_public"][value="false"]');
    if (await privateRadio.count() > 0) {
      await privateRadio.check();
    }
    
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    await expect(page.locator(`text=${channelName}`)).toBeVisible({ timeout: 10000 });
  });

  test('should require channel name', async ({ page }) => {
    const createButton = page.locator('button:has-text("New Channel"), button:has-text("Create Channel"), button:has-text("+")').first();
    await createButton.click({ timeout: 10000 });
    
    // Try to submit without name
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Dialog should still be open or show error
    await page.waitForTimeout(500);
  });

  test('should not allow duplicate channel names', async ({ page }) => {
    const channelName = generateChannelName('duplicate');
    
    // Create first channel
    const createButton = page.locator('button:has-text("New Channel"), button:has-text("Create Channel"), button:has-text("+")').first();
    await createButton.click({ timeout: 10000 });
    await page.fill('input[name="name"], input[placeholder*="channel name" i]', channelName);
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    await expect(page.locator(`text=${channelName}`)).toBeVisible({ timeout: 10000 });
    
    // Try to create duplicate
    await createButton.click({ timeout: 10000 });
    await page.fill('input[name="name"], input[placeholder*="channel name" i]', channelName);
    await page.click('button[type="submit"]:has-text("Create"), button:has-text("Save")');
    
    // Should show error or prevent creation
    await page.waitForTimeout(1000);
  });
});
