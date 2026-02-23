/**
 * Rocicorp Zero Sync Mocks
 * 
 * Provides mocking utilities for Rocicorp Zero real-time sync.
 * Intercepts WebSocket and HTTP calls to simulate real-time updates
 * without requiring an actual Zero server running.
 */

import { Page, Route } from '@playwright/test';

/**
 * Setup Zero mock handlers for a page
 * This intercepts all Zero-related network requests and provides mock responses
 */
export async function setupZeroMocks(page: Page) {
  // Keep tests deterministic by forcing English locale.
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "en",
      domain: "localhost",
      path: "/",
    },
  ]);

  // Mock Zero server WebSocket connection
  // Since Playwright doesn't directly intercept WebSockets, we mock the HTTP endpoints instead
  
  // Mock JWKS endpoint for Zero auth
  await page.route('**/api/auth/jwks', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        keys: [
          {
            kty: 'RSA',
            use: 'sig',
            kid: 'test-key-id',
            alg: 'RS256',
            n: 'mock-modulus',
            e: 'AQAB',
          },
        ],
      }),
    });
  });
  
  // Mock Zero get-queries endpoint with a valid transform response shape
  await page.route('**/api/zero/get-queries', async (route: Route) => {
    let body: unknown = null;
    try {
      body = route.request().postDataJSON();
    } catch {
      body = null;
    }

    const response = buildTransformResponse(body);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
  
  // Mock Zero push/mutate endpoint
  await page.route('**/api/zero/push', async (route: Route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    
    // Echo back the mutation as successful
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        mutations: postData.mutations || [],
      }),
    });
  });
  
  // Mock Zero server connection
  await page.route('**/localhost:4848/**', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        version: 'test',
      }),
    });
  });
}

function buildTransformResponse(body: unknown) {
  if (
    Array.isArray(body) &&
    body.length === 2 &&
    body[0] === 'transform' &&
    Array.isArray(body[1])
  ) {
    const responses = body[1].map((query) => {
      const id = typeof query?.id === 'string' ? query.id : 'unknown';
      const name = typeof query?.name === 'string' ? query.name : 'unknown';
      return {
        id,
        name,
        // Minimal AST that satisfies Zero's transform response schema
        ast: {
          table: 'usersTable',
        },
      };
    });

    return ['transformed', responses];
  }

  return ['transformed', []];
}

/**
 * Simulate a real-time message from another user
 * This helps test real-time sync functionality without a real Zero server
 */
export async function simulateRealtimeMessage(
  page: Page,
  message: {
    id: string;
    channelId: string;
    userId: string;
    content: string;
  }
) {
  // Inject a message update via page evaluation
  await page.evaluate((msg) => {
    // This simulates a Zero sync update
    // In a real app, this would come through the Zero client
    const event = new CustomEvent('zero-update', {
      detail: {
        type: 'message-created',
        data: msg,
      },
    });
    window.dispatchEvent(event);
  }, message);
}

/**
 * Simulate real-time channel update
 */
export async function simulateRealtimeChannelUpdate(
  page: Page,
  channel: {
    id: string;
    name: string;
    description?: string;
  }
) {
  await page.evaluate((ch) => {
    const event = new CustomEvent('zero-update', {
      detail: {
        type: 'channel-updated',
        data: ch,
      },
    });
    window.dispatchEvent(event);
  }, channel);
}

/**
 * Simulate real-time notification
 */
export async function simulateRealtimeNotification(
  page: Page,
  notification: {
    id: string;
    userId: string;
    messageId: string;
    type: 'mention' | 'reply';
  }
) {
  await page.evaluate((notif) => {
    const event = new CustomEvent('zero-update', {
      detail: {
        type: 'notification-created',
        data: notif,
      },
    });
    window.dispatchEvent(event);
  }, notification);
}

/**
 * Wait for Zero sync to complete
 * Useful for ensuring optimistic updates are reconciled
 */
export async function waitForZeroSync(page: Page, timeout: number = 2000): Promise<void> {
  // Wait for any pending network requests to complete
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Disable Zero sync for tests that don't need it
 * This can speed up tests that focus on UI without real-time features
 */
export async function disableZeroSync(page: Page) {
  await page.route('**/localhost:4848/**', (route: Route) => {
    route.abort();
  });
  
  await page.route('**/api/zero/**', (route: Route) => {
    route.fulfill({
      status: 503,
      body: 'Zero sync disabled for testing',
    });
  });
}
