import { db } from "@/app/db/db";
import { channelGithubIntegrationsTable } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// GitHub OAuth configuration
export const GITHUB_CLIENT_ID = process.env.APP_GH_CLIENT_ID!;
export const GITHUB_CLIENT_SECRET = process.env.APP_GH_CLIENT_SECRET!;
export const GITHUB_REDIRECT_URI =
  process.env.APP_GH_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`;

export const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";
export const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const GITHUB_API_BASE = "https://api.github.com";

// Scopes needed for repo access
export const GITHUB_SCOPES = ["repo", "read:user"].join(" ");

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  private: boolean;
  description: string | null;
  html_url: string;
  default_branch: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  body: string | null;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  pull_request?: {
    url: string;
  };
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  body: string | null;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  merged: boolean;
  draft: boolean;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubBranchComparison {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitHubCommit[];
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
  html_url: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "action_required"
    | "cancelled"
    | "failure"
    | "neutral"
    | "success"
    | "skipped"
    | "stale"
    | "timed_out"
    | null;
  html_url: string;
  run_number: number;
  run_attempt: number;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  head_branch: string;
  head_sha: string;
  display_title?: string;
  actor?: {
    login: string;
    avatar_url: string;
  } | null;
  head_commit?: {
    id?: string;
    message?: string;
  } | null;
}

// Simple in-memory cache for GitHub API responses
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

export class GitHubClient {
  constructor(private accessToken: string) {}

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const cacheKey = `${this.accessToken}:${endpoint}`;
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  }

  async getUser(): Promise<GitHubUser> {
    return this.fetch<GitHubUser>("/user");
  }

  async getRepos(): Promise<GitHubRepo[]> {
    return this.fetch<GitHubRepo[]>("/user/repos?per_page=100&sort=updated");
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return this.fetch<GitHubRepo>(`/repos/${owner}/${repo}`);
  }

  async getIssue(
    owner: string,
    repo: string,
    number: number
  ): Promise<GitHubIssue> {
    return this.fetch<GitHubIssue>(`/repos/${owner}/${repo}/issues/${number}`);
  }

  async getPullRequest(
    owner: string,
    repo: string,
    number: number
  ): Promise<GitHubPullRequest> {
    return this.fetch<GitHubPullRequest>(
      `/repos/${owner}/${repo}/pulls/${number}`
    );
  }

  async getCommit(
    owner: string,
    repo: string,
    sha: string
  ): Promise<GitHubCommit> {
    return this.fetch<GitHubCommit>(`/repos/${owner}/${repo}/commits/${sha}`);
  }

  async getBranch(
    owner: string,
    repo: string,
    branch: string
  ): Promise<GitHubBranch> {
    return this.fetch<GitHubBranch>(
      `/repos/${owner}/${repo}/branches/${branch}`
    );
  }

  async compareBranches(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<GitHubBranchComparison> {
    return this.fetch<GitHubBranchComparison>(
      `/repos/${owner}/${repo}/compare/${base}...${head}`
    );
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<GitHubFileContent> {
    const query = ref ? `?ref=${ref}` : "";
    return this.fetch<GitHubFileContent>(
      `/repos/${owner}/${repo}/contents/${path}${query}`
    );
  }

  async getRecentCommits(
    owner: string,
    repo: string,
    count: number = 5
  ): Promise<GitHubCommit[]> {
    return this.fetch<GitHubCommit[]>(
      `/repos/${owner}/${repo}/commits?per_page=${count}`
    );
  }

  async getOpenPullRequests(
    owner: string,
    repo: string,
    count: number = 5
  ): Promise<GitHubPullRequest[]> {
    return this.fetch<GitHubPullRequest[]>(
      `/repos/${owner}/${repo}/pulls?state=open&per_page=${count}`
    );
  }

  async getOpenIssues(
    owner: string,
    repo: string,
    count: number = 5
  ): Promise<GitHubIssue[]> {
    return this.fetch<GitHubIssue[]>(
      `/repos/${owner}/${repo}/issues?state=open&per_page=${count}`
    );
  }

  async getWorkflowRuns(
    owner: string,
    repo: string,
    count: number = 5
  ): Promise<GitHubWorkflowRun[]> {
    return this.fetch<{ workflow_runs: GitHubWorkflowRun[] }>(
      `/repos/${owner}/${repo}/actions/runs?per_page=${count}`
    ).then((resp) => resp.workflow_runs);
  }

  async getLatestWorkflowRun(
    owner: string,
    repo: string
  ): Promise<GitHubWorkflowRun | null> {
    const runs = await this.getWorkflowRuns(owner, repo, 1);
    return runs[0] || null;
  }
}

// Helper to get GitHub client for a channel
export async function getGitHubClientForChannel(
  channelId: string
): Promise<GitHubClient | null> {
  const integration = await db
    .select()
    .from(channelGithubIntegrationsTable)
    .where(eq(channelGithubIntegrationsTable.channel_id, channelId))
    .limit(1);

  if (integration.length === 0) {
    return null;
  }

  return new GitHubClient(integration[0].access_token);
}

// Helper to get integration for a channel
export async function getChannelGitHubIntegration(channelId: string) {
  const integration = await db
    .select()
    .from(channelGithubIntegrationsTable)
    .where(eq(channelGithubIntegrationsTable.channel_id, channelId))
    .limit(1);

  return integration[0] || null;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }

  return data.access_token;
}
