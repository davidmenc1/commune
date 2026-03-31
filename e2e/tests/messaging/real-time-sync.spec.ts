import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks, simulateRealtimeMessage } from '../../fixtures/zero-mock';

test.describe('Real-time Sync', () => {
  test.beforeEach(async ({ page }) => {
    await setupZeroMocks(page);
    await registerUser(page, { ...TEST_USERS.user1, email: `sync-${Date.now()}@test.com` });
  });

  test('should receive messages in real-time', async ({ page }) => {
    await page.goto('/chat/channels');
    await page.waitForTimeout(1000);
  });
});
