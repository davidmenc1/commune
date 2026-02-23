# E2E Testing Guide

This directory contains end-to-end tests for the chat application using Playwright.

## Overview

The test suite provides comprehensive coverage of:
- Authentication (login, register, logout)
- Channel management (create, list, access control, settings)
- Messaging (send, edit, delete, reactions, attachments, real-time sync)
- Threads (creation, replies, navigation)
- Mentions & Notifications (user mentions, channel mentions, autocomplete)
- GitHub Integration (OAuth, URL unfurling, mentions, builds)
- GitLab Integration (OAuth, URL unfurling, mentions, pipelines)
- Groups (creation, management)
- Webhooks (creation, message handling)
- UI/Navigation (workspace, command palette, responsive design)

## Directory Structure

```
e2e/
├── fixtures/               # Shared test utilities and mocks
│   ├── auth.ts            # Authentication helpers
│   ├── database.ts        # Database test data generators
│   ├── zero-mock.ts       # Rocicorp Zero sync mocks
│   ├── github-mocks.ts    # GitHub API mocks
│   ├── gitlab-mocks.ts    # GitLab API mocks
│   ├── files.ts           # File upload fixtures
│   └── index.ts           # Central exports
├── scripts/               # Setup and utility scripts
│   └── setup-test-db.ts   # Database initialization script
├── tests/                 # Test suites
│   ├── auth/              # Authentication tests
│   ├── channels/          # Channel management tests
│   ├── messaging/         # Messaging tests
│   ├── threads/           # Thread tests
│   ├── mentions/          # Mention & notification tests
│   ├── github/            # GitHub integration tests
│   ├── gitlab/            # GitLab integration tests
│   ├── groups/            # Group management tests
│   ├── webhooks/          # Webhook tests
│   └── ui/                # UI/navigation tests
├── .auth/                 # Generated authentication states
├── .tmp/                  # Temporary test files
└── test-results/          # Test execution results
```

## Prerequisites

1. **Node.js** - Ensure Node.js is installed (v18 or later)
2. **PostgreSQL** - Running PostgreSQL instance for test database
3. **Dependencies** - All npm packages installed

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Test Environment

The `.env.test` file contains test-specific configuration:

```env
# Database - Separate test database (important!)
ZERO_UPSTREAM_DB=postgresql://postgres:postgres@localhost:5432/chat-app-test

# Auth
BETTER_AUTH_SECRET=test-secret-key-for-e2e-testing
BETTER_AUTH_DB="./better-auth-test.db"

# Other configurations...
```

**Important:** The test database should be completely separate from your development database to avoid data corruption.

### 3. Create Test Database

Run the setup script to create a clean test database:

```bash
npm run test:e2e:setup
```

This will:
- Drop existing test database (if any)
- Create fresh test database
- Run migrations

## Running Tests

### All Tests (Headless)

```bash
npm run test:e2e
```

Runs all tests across all configured browsers (Chromium, Firefox, WebKit) in headless mode.

### Interactive UI Mode

```bash
npm run test:e2e:ui
```

Opens Playwright's interactive UI for running and debugging tests visually.

### Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

Runs tests with visible browser windows.

### Debug Mode

```bash
npm run test:e2e:debug
```

Runs tests with Playwright Inspector for step-by-step debugging.

### Specific Test File

```bash
npm run test:e2e tests/auth/login.spec.ts
```

### Specific Test Suite

```bash
npm run test:e2e tests/auth/
```

### View Test Report

```bash
npm run test:e2e:report
```

Opens the HTML test report from the last test run.

### Code Generation

```bash
npm run test:e2e:codegen
```

Opens Playwright's code generator to record user interactions and generate test code.

## Test Categories

### Authentication Tests (3 files, ~20 tests)
- `auth/register.spec.ts` - User registration
- `auth/login.spec.ts` - User login
- `auth/logout.spec.ts` - User logout

### Channel Tests (4 files, ~25 tests)
- `channels/channel-list.spec.ts` - Channel list display
- `channels/channel-creation.spec.ts` - Creating channels
- `channels/channel-access.spec.ts` - Access control
- `channels/channel-settings.spec.ts` - Channel settings & deletion

### Messaging Tests (5 files, ~30 tests)
- `messaging/send-message.spec.ts` - Sending messages
- `messaging/edit-delete-message.spec.ts` - Editing and deleting
- `messaging/reactions.spec.ts` - Emoji reactions
- `messaging/attachments.spec.ts` - File uploads
- `messaging/real-time-sync.spec.ts` - Real-time updates

### Thread Tests (3 files, ~15 tests)
- `threads/thread-creation.spec.ts` - Creating threads
- `threads/thread-replies.spec.ts` - Replying in threads
- `threads/thread-navigation.spec.ts` - Thread navigation

### Mentions & Notifications (4 files, ~20 tests)
- `mentions/user-mentions.spec.ts` - @user mentions
- `mentions/channel-mentions.spec.ts` - #channel mentions
- `mentions/mention-autocomplete.spec.ts` - Mention suggestions
- `mentions/notifications.spec.ts` - Notification system

### GitHub Integration (4 files, ~25 tests)
- `github/github-integration.spec.ts` - OAuth & setup
- `github/github-url-unfurl.spec.ts` - URL unfurling
- `github/github-mentions.spec.ts` - GitHub mentions
- `github/github-builds.spec.ts` - CI/CD build tracking

### GitLab Integration (4 files, ~25 tests)
- `gitlab/gitlab-integration.spec.ts` - OAuth & setup
- `gitlab/gitlab-url-unfurl.spec.ts` - URL unfurling
- `gitlab/gitlab-mentions.spec.ts` - GitLab mentions
- `gitlab/gitlab-pipelines.spec.ts` - Pipeline tracking

### Group Tests (2 files, ~10 tests)
- `groups/group-creation.spec.ts` - Creating groups
- `groups/group-management.spec.ts` - Managing groups

### Webhook Tests (2 files, ~8 tests)
- `webhooks/webhook-creation.spec.ts` - Creating webhooks
- `webhooks/webhook-messages.spec.ts` - Webhook messages

### UI/Navigation (3 files, ~15 tests)
- `ui/workspace-navigation.spec.ts` - Workspace navigation
- `ui/command-palette.spec.ts` - Command palette (Cmd+K)
- `ui/responsive-layout.spec.ts` - Responsive design

## Mocking Strategy

### External Services

All external services are mocked to ensure tests are:
- **Fast** - No real API calls
- **Reliable** - No network dependencies
- **Isolated** - No external state

Mocked services include:
- **Rocicorp Zero sync** - Intercepted at HTTP/WebSocket level
- **GitHub API** - Complete mock responses for all endpoints
- **GitLab API** - Complete mock responses for all endpoints
- **Better Auth** - Mock JWT tokens and sessions

### Test Database

Tests use a separate PostgreSQL database (`chat-app-test`) that is:
- Isolated from development data
- Reset before test runs (via setup script)
- Identical schema to production

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { registerUser, TEST_USERS } from '../../fixtures/auth';
import { setupZeroMocks } from '../../fixtures/zero-mock';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mocks
    await setupZeroMocks(page);
    
    // Create authenticated user
    await registerUser(page, { 
      ...TEST_USERS.user1, 
      email: `test-${Date.now()}@test.com` 
    });
  });

  test('should do something', async ({ page }) => {
    // Navigate
    await page.goto('/some-page');
    
    // Interact
    await page.click('button');
    
    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Using Fixtures

```typescript
import { 
  TEST_USERS, 
  registerUser, 
  loginUser 
} from '../../fixtures/auth';

import { 
  generateChannelName,
  createTestMessage 
} from '../../fixtures/database';

import { 
  setupGitHubAPIMocks,
  MOCK_GITHUB_ISSUE 
} from '../../fixtures/github-mocks';
```

### Common Patterns

**Wait for navigation:**
```typescript
await expect(page).toHaveURL('/expected-path');
```

**Wait for element:**
```typescript
await expect(page.locator('text=Hello')).toBeVisible({ timeout: 5000 });
```

**Fill and submit form:**
```typescript
await page.fill('input[name="email"]', 'test@test.com');
await page.click('button[type="submit"]');
```

**Upload file:**
```typescript
import { createTestImage } from '../../fixtures/files';
const imagePath = createTestImage();
await page.setInputFiles('input[type="file"]', imagePath);
```

## CI/CD Integration

Tests can run in CI environments. Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e:setup
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: e2e/test-results/
```

## Troubleshooting

### Tests Failing Due to Timeouts

Increase timeout in specific test:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### Authentication Issues

Ensure test database is set up:
```bash
npm run test:e2e:setup
```

### Browser Not Found

Install browsers:
```bash
npx playwright install
```

### Port Already in Use

Make sure development server on port 3000 is stopped, or change port in `playwright.config.ts`.

### Database Connection Errors

Check PostgreSQL is running and credentials in `.env.test` are correct.

## Best Practices

1. **Unique Test Data** - Use timestamps in test emails/names to avoid conflicts
2. **Independent Tests** - Each test should be runnable in isolation
3. **Explicit Waits** - Always wait for elements explicitly, don't use arbitrary timeouts
4. **Descriptive Names** - Test names should clearly describe what they test
5. **Clean Up** - Tests should leave the system in a clean state
6. **Mock External Services** - Never depend on real external APIs
7. **Test User Flows** - Focus on realistic user scenarios

## Performance

Expected test execution times:
- Full suite: 5-8 minutes (parallelized)
- Single category: 30-60 seconds
- Single test file: 10-20 seconds

## Contributing

When adding new features, please:
1. Add corresponding E2E tests
2. Update this README if adding new test categories
3. Ensure all existing tests still pass
4. Follow existing test patterns and structure

## Support

For issues or questions about E2E tests:
1. Check this README
2. Review existing test files for examples
3. Check Playwright documentation: https://playwright.dev
