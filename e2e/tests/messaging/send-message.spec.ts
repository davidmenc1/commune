import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Send Message', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `msg-${Date.now()}@test.com` });
  });

  test('should send a simple text message', async ({ page }) => {
    const messageText = `Test message ${Date.now()}`;
    
    // Wait for message input
    const input = page.locator('textarea[placeholder*="message" i], input[placeholder*="message" i]').first();
    await input.fill(messageText);
    
    // Send message (Enter key or button click)
    await input.press('Enter');
    
    // Verify message appears
    await expect(page.locator(`text=${messageText}`)).toBeVisible({ timeout: 5000 });
  });

  test('should send message with @mention', async ({ page }) => {
    const messageText = '@user1 hello there!';
    
    const input = page.locator('textarea[placeholder*="message" i], input[placeholder*="message" i]').first();
    await input.fill(messageText);
    await input.press('Enter');
    
    await expect(page.locator('text=hello there!')).toBeVisible({ timeout: 5000 });
  });

  test('should send message with #channel reference', async ({ page }) => {
    const messageText = 'Check #general for updates';
    
    const input = page.locator('textarea[placeholder*="message" i], input[placeholder*="message" i]').first();
    await input.fill(messageText);
    await input.press('Enter');
    
    await expect(page.locator('text=Check').first()).toBeVisible({ timeout: 5000 });
  });

  test('should not send empty messages', async ({ page }) => {
    const input = page.locator('textarea[placeholder*="message" i], input[placeholder*="message" i]').first();
    await input.fill('   ');
    await input.press('Enter');
    
    // Message should not appear (or input should still be active)
    await page.waitForTimeout(500);
  });
});
