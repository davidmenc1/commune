/**
 * GitLab API Mocks
 * 
 * Provides comprehensive mocking for GitLab API responses.
 * Includes mock data for issues, MRs, commits, branches, files, and CI/CD pipelines.
 */

import { Page, Route } from '@playwright/test';

/**
 * Mock GitLab OAuth responses
 */
export async function setupGitLabOAuthMocks(page: Page) {
  // Mock OAuth authorization page
  await page.route('**/gitlab.com/oauth/authorize**', (route: Route) => {
    // Redirect directly to callback with mock code
    const redirectUri = route.request().url();
    const callbackUrl = new URL(redirectUri).searchParams.get('redirect_uri') || '';
    route.fulfill({
      status: 302,
      headers: {
        Location: `${callbackUrl}?code=mock-gitlab-auth-code`,
      },
    });
  });
  
  // Mock token exchange
  await page.route('**/gitlab.com/oauth/token', (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-gitlab-access-token',
        token_type: 'Bearer',
        expires_in: 7200,
        refresh_token: 'mock-refresh-token',
        scope: 'read_api read_user read_repository',
      }),
    });
  });
}

/**
 * Setup complete GitLab API mocks
 */
export async function setupGitLabAPIMocks(page: Page) {
  const GITLAB_API = 'https://gitlab.com/api/v4';
  
  // Mock user endpoint
  await page.route(`${GITLAB_API}/user`, (route: Route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_GITLAB_USER),
    });
  });
  
  // Mock projects list
  await page.route(`${GITLAB_API}/projects**`, (route: Route) => {
    const url = route.request().url();
    
    // If it's a list query
    if (url.includes('membership=true')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_GITLAB_PROJECT]),
      });
    } else {
      // Specific project
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITLAB_PROJECT),
      });
    }
  });
  
  // Mock project-specific endpoints
  await page.route(`${GITLAB_API}/projects/*/**`, (route: Route) => {
    const url = route.request().url();
    
    if (url.includes('/issues/')) {
      const issueIid = url.match(/\/issues\/(\d+)/)?.[1];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_GITLAB_ISSUE, iid: parseInt(issueIid || '1') }),
      });
    } else if (url.includes('/merge_requests/')) {
      const mrIid = url.match(/\/merge_requests\/(\d+)/)?.[1];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_GITLAB_MR, iid: parseInt(mrIid || '1') }),
      });
    } else if (url.includes('/repository/commits/')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITLAB_COMMIT),
      });
    } else if (url.includes('/repository/branches/')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITLAB_BRANCH),
      });
    } else if (url.includes('/repository/files/')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GITLAB_FILE),
      });
    } else if (url.includes('/pipelines')) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_GITLAB_PIPELINE]),
      });
    } else {
      route.continue();
    }
  });
}

// Mock data structures

export const MOCK_GITLAB_USER = {
  id: 234567,
  username: 'testuser',
  name: 'Test User',
  avatar_url: 'https://secure.gravatar.com/avatar/test',
  email: 'test@example.com',
  web_url: 'https://gitlab.com/testuser',
};

export const MOCK_GITLAB_PROJECT = {
  id: 345678,
  name: 'test-project',
  path: 'test-project',
  path_with_namespace: 'testuser/test-project',
  namespace: {
    id: 456789,
    name: 'testuser',
    path: 'testuser',
    avatar_url: 'https://secure.gravatar.com/avatar/test',
  },
  visibility: 'public',
  description: 'A test project for E2E testing',
  web_url: 'https://gitlab.com/testuser/test-project',
  default_branch: 'main',
  avatar_url: null,
};

export const MOCK_GITLAB_ISSUE = {
  iid: 123,
  title: 'Test Issue: Fix authentication bug',
  state: 'opened',
  description: 'This is a test issue for E2E testing.\n\n## Steps to reproduce\n1. Go to login page\n2. Enter invalid credentials\n3. See error',
  web_url: 'https://gitlab.com/testuser/test-project/-/issues/123',
  author: {
    username: 'testuser',
    name: 'Test User',
    avatar_url: 'https://secure.gravatar.com/avatar/test',
  },
  labels: ['bug', 'priority::high'],
  assignees: [
    {
      username: 'testuser',
      name: 'Test User',
      avatar_url: 'https://secure.gravatar.com/avatar/test',
    },
  ],
  created_at: '2024-01-15T10:30:00.000Z',
  updated_at: '2024-01-16T14:20:00.000Z',
  closed_at: null,
};

export const MOCK_GITLAB_MR = {
  iid: 456,
  title: 'feat: Add new feature for chat',
  state: 'opened',
  description: 'This MR adds a new feature.\n\n## Changes\n- Added feature X\n- Fixed bug Y\n- Updated docs',
  web_url: 'https://gitlab.com/testuser/test-project/-/merge_requests/456',
  author: {
    username: 'testuser',
    name: 'Test User',
    avatar_url: 'https://secure.gravatar.com/avatar/test',
  },
  labels: ['feature'],
  assignees: [],
  created_at: '2024-01-15T10:30:00.000Z',
  updated_at: '2024-01-16T14:20:00.000Z',
  closed_at: null,
  merged_at: null,
  draft: false,
  source_branch: 'feature/new-chat-feature',
  target_branch: 'main',
  sha: 'abc123def456',
  diff_refs: {
    base_sha: 'base123',
    head_sha: 'abc123def456',
    start_sha: 'start123',
  },
  changes_count: '168',
};

export const MOCK_GITLAB_COMMIT = {
  id: 'abc123def456789',
  short_id: 'abc123d',
  title: 'feat: Implement user authentication',
  message: 'feat: Implement user authentication\n\nAdded login and registration pages',
  web_url: 'https://gitlab.com/testuser/test-project/-/commit/abc123def456789',
  author_name: 'Test User',
  author_email: 'test@example.com',
  authored_date: '2024-01-15T10:30:00.000Z',
  committer_name: 'Test User',
  committer_email: 'test@example.com',
  committed_date: '2024-01-15T10:30:00.000Z',
  stats: {
    additions: 234,
    deletions: 12,
    total: 246,
  },
};

export const MOCK_GITLAB_BRANCH = {
  name: 'feature/new-chat-feature',
  commit: {
    id: 'abc123def456789',
    short_id: 'abc123d',
    title: 'feat: Implement user authentication',
    author_name: 'Test User',
    authored_date: '2024-01-15T10:30:00.000Z',
    web_url: 'https://gitlab.com/testuser/test-project/-/commit/abc123def456789',
  },
  protected: false,
  default: false,
  web_url: 'https://gitlab.com/testuser/test-project/-/tree/feature/new-chat-feature',
};

export const MOCK_GITLAB_FILE = {
  file_name: 'README.md',
  file_path: 'README.md',
  size: 1024,
  encoding: 'base64',
  content: Buffer.from('# Test Project\n\nThis is a test README.').toString('base64'),
  content_sha256: 'sha256-hash',
  ref: 'main',
  blob_id: 'blob-123',
  commit_id: 'abc123def456789',
  last_commit_id: 'abc123def456789',
};

export const MOCK_GITLAB_PIPELINE = {
  id: 876543,
  iid: 42,
  status: 'success',
  source: 'push',
  ref: 'main',
  sha: 'abc123def456789',
  web_url: 'https://gitlab.com/testuser/test-project/-/pipelines/876543',
  created_at: '2024-01-16T10:00:00.000Z',
  updated_at: '2024-01-16T10:05:00.000Z',
  started_at: '2024-01-16T10:00:05.000Z',
  finished_at: '2024-01-16T10:05:00.000Z',
  user: {
    username: 'testuser',
    name: 'Test User',
    avatar_url: 'https://secure.gravatar.com/avatar/test',
  },
};

export const MOCK_GITLAB_PIPELINE_FAILED = {
  ...MOCK_GITLAB_PIPELINE,
  id: 876544,
  iid: 43,
  status: 'failed',
};

export const MOCK_GITLAB_PIPELINE_RUNNING = {
  ...MOCK_GITLAB_PIPELINE,
  id: 876545,
  iid: 44,
  status: 'running',
  finished_at: null,
};
