import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `cmd-${Date.now()}@test.com` });
  });

  test('should open command palette with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Meta+K');
    await page.waitForTimeout(500);
  });
});
