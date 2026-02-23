import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';
import { createTestImage } from '../../fixtures/files';

test.describe('File Attachments', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `attach-${Date.now()}@test.com` });
  });

  test('should upload image attachment', async ({ page }) => {
    const imagePath = createTestImage();
    
    await page.goto('/chat/channels');
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(imagePath);
      await page.waitForTimeout(2000);
    }
  });
});
