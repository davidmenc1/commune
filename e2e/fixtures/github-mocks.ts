/**
 * GitHub API Mocks
 * 
 * Provides comprehensive mocking for GitHub API responses.
 * Includes mock data for issues, PRs, commits, branches, files, and CI/CD builds.
 */

import { Page, Route } from '@playwright/test';

/**
 * Mock GitHub OAuth responses
 */
export async function setupGitHubOAuthMocks(page: Page) {
  // Mock OAuth authorization page
  await page.route('**/github.com/login/oauth/authorize**', (route: Route) => {
    // Redirect directly to callback with mock code
    const redirectUri = route.request().url();
    const callbackUrl = new URL(redirectUri).searchParams.get('redirect_uri') || '';
    route.fulfill({
      status: 302,
      headers: {
        Location: `${callbackUrl}?code=mock-github-auth-code`,
      },
    });
  });
  
  // Mock token exchange
  await page.route('**/github.com/login/oauth/access_token', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-github-access-token',
        token_type: 'bearer',
        scope: 'repo,read:user',
      }),
    });
  });
}

/**
 * Setup complete GitHub API mocks
 */
export async function setupGitHubAPIMocks(page: Page) {
  const GITHUB_API = 'https://api.github.com';
  
  // Mock user endpoint
  await page.route(`${GITHUB_API}/user`, (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_GITHUB_USER),
    });
  });
  
  // Mock repos list
  await page.route(`${GITHUB_API}/user/repos**`, (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([MOCK_GITHUB_REPO]),
    });
  });
  
  // Mock specific repo
  await page.route(`${GITHUB_API}/repos/*/*`, (route: Route) => {
    const url = route.request().url();
    
    // Extract owner/repo from URL
    const match = url.match(/\/repos\/([^/]+)\/([^/]+)/);
    if (!match) {
      return route.continue();
    }
    
    const [, owner, repo] = match;
    
    // Route to specific mocks based on URL path
    if (url.includes('/issues/')) {
      const issueNumber = url.match(/\/issues\/(\d+)/)?.[1];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_GITHUB_ISSUE, number: parseInt(issueNumber || '1') }),
      });
    } else if (url.includes('/pulls/')) {
      const prNumber = url.match(/\/pulls\/(\d+)/)?.[1];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_GITHUB_PR, number: parseInt(prNumber || '1') }),
      });
    } else if (url.includes('/commits/')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITHUB_COMMIT),
      });
    } else if (url.includes('/branches/')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITHUB_BRANCH),
      });
    } else if (url.includes('/contents/')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITHUB_FILE),
      });
    } else if (url.includes('/actions/runs')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ workflow_runs: [MOCK_GITHUB_WORKFLOW_RUN] }),
      });
    } else {
      // Default: return repo info
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITHUB_REPO),
      });
    }
  });
}

// Mock data structures

export const MOCK_GITHUB_USER = {
  login: 'testuser',
  id: 123456,
  avatar_url: 'https://avatars.githubusercontent.com/u/123456',
  name: 'Test User',
  email: 'test@example.com',
};

export const MOCK_GITHUB_REPO = {
  id: 789012,
  name: 'test-repo',
  full_name: 'testuser/test-repo',
  owner: {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456',
  },
  private: false,
  description: 'A test repository for E2E testing',
  html_url: 'https://github.com/testuser/test-repo',
  default_branch: 'main',
};

export const MOCK_GITHUB_ISSUE = {
  number: 123,
  title: 'Test Issue: Fix bug in login',
  state: 'open',
  body: 'This is a test issue for E2E testing.\n\n## Steps to reproduce\n1. Go to login page\n2. Enter invalid credentials\n3. See error',
  html_url: 'https://github.com/testuser/test-repo/issues/123',
  user: {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456',
  },
  labels: [
    { name: 'bug', color: 'd73a4a' },
    { name: 'priority: high', color: 'ff0000' },
  ],
  assignees: [
    {
      login: 'testuser',
      avatar_url: 'https://avatars.githubusercontent.com/u/123456',
    },
  ],
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-16T14:20:00Z',
  closed_at: null,
};

export const MOCK_GITHUB_PR = {
  number: 456,
  title: 'feat: Add new feature for chat',
  state: 'open',
  body: 'This PR adds a new feature.\n\n## Changes\n- Added feature X\n- Fixed bug Y\n- Updated docs',
  html_url: 'https://github.com/testuser/test-repo/pull/456',
  user: {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456',
  },
  labels: [
    { name: 'feature', color: '0e8a16' },
  ],
  assignees: [],
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-16T14:20:00Z',
  closed_at: null,
  merged_at: null,
  merged: false,
  draft: false,
  head: {
    ref: 'feature/new-chat-feature',
    sha: 'abc123def456',
  },
  base: {
    ref: 'main',
  },
  additions: 145,
  deletions: 23,
  changed_files: 8,
};

export const MOCK_GITHUB_COMMIT = {
  sha: 'abc123def456789',
  html_url: 'https://github.com/testuser/test-repo/commit/abc123def456789',
  commit: {
    message: 'feat: Implement user authentication\n\nAdded login and registration pages',
    author: {
      name: 'Test User',
      email: 'test@example.com',
      date: '2024-01-15T10:30:00Z',
    },
  },
  author: {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456',
  },
  stats: {
    additions: 234,
    deletions: 12,
    total: 246,
  },
  files: [
    {
      filename: 'src/auth/login.ts',
      status: 'added',
      additions: 120,
      deletions: 0,
    },
    {
      filename: 'src/auth/register.ts',
      status: 'added',
      additions: 114,
      deletions: 0,
    },
  ],
};

export const MOCK_GITHUB_BRANCH = {
  name: 'feature/new-chat-feature',
  commit: {
    sha: 'abc123def456789',
    url: 'https://api.github.com/repos/testuser/test-repo/commits/abc123def456789',
  },
  protected: false,
};

export const MOCK_GITHUB_FILE = {
  name: 'README.md',
  path: 'README.md',
  sha: 'file-sha-123',
  size: 1024,
  type: 'file',
  content: Buffer.from('# Test Repository\n\nThis is a test README.').toString('base64'),
  encoding: 'base64',
  html_url: 'https://github.com/testuser/test-repo/blob/main/README.md',
};

export const MOCK_GITHUB_WORKFLOW_RUN = {
  id: 987654,
  name: 'CI',
  status: 'completed',
  conclusion: 'success',
  html_url: 'https://github.com/testuser/test-repo/actions/runs/987654',
  run_number: 42,
  run_attempt: 1,
  event: 'push',
  created_at: '2024-01-16T10:00:00Z',
  updated_at: '2024-01-16T10:05:00Z',
  run_started_at: '2024-01-16T10:00:05Z',
  head_branch: 'main',
  head_sha: 'abc123def456789',
  display_title: 'CI Build',
  actor: {
    login: 'testuser',
    avatar_url: 'https://avatars.githubusercontent.com/u/123456',
  },
  head_commit: {
    id: 'abc123def456789',
    message: 'feat: Implement user authentication',
  },
};

export const MOCK_GITHUB_WORKFLOW_RUN_FAILED = {
  ...MOCK_GITHUB_WORKFLOW_RUN,
  id: 987655,
  status: 'completed',
  conclusion: 'failure',
  run_number: 43,
};

export const MOCK_GITHUB_WORKFLOW_RUN_RUNNING = {
  ...MOCK_GITHUB_WORKFLOW_RUN,
  id: 987656,
  status: 'in_progress',
  conclusion: null,
  run_number: 44,
};
