import { db } from "@/app/db/db";
import { channelGithubIntegrationsTable } from "@/app/db/schema";
import { eq } from "drizzle-orm";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

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

export interface GitHubTokenExchange {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
}

interface GitHubStoredCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
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

function parseTokenExpiry(seconds: unknown): Date | null {
  const ttl =
    typeof seconds === "number"
      ? seconds
      : typeof seconds === "string"
        ? Number.parseInt(seconds, 10)
        : Number.NaN;

  if (!Number.isFinite(ttl) || ttl <= 0) {
    return null;
  }

  return new Date(Date.now() + ttl * 1000);
}

function parseTokenExchange(data: Record<string, unknown>): GitHubTokenExchange {
  const accessToken =
    typeof data.access_token === "string" ? data.access_token : null;

  if (!accessToken) {
    throw new Error("GitHub OAuth error: missing access_token");
  }

  return {
    accessToken,
    refreshToken:
      typeof data.refresh_token === "string" ? data.refresh_token : null,
    expiresAt: parseTokenExpiry(data.expires_in),
    refreshTokenExpiresAt: parseTokenExpiry(data.refresh_token_expires_in),
  };
}

function parseStoredDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseGitHubStoredCredentials(
  storedValue: string
): GitHubStoredCredentials {
  try {
    const parsed = JSON.parse(storedValue) as {
      accessToken?: unknown;
      refreshToken?: unknown;
      expiresAt?: unknown;
      refreshTokenExpiresAt?: unknown;
    };

    if (typeof parsed.accessToken !== "string" || !parsed.accessToken) {
      throw new Error("missing access token");
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken:
        typeof parsed.refreshToken === "string" ? parsed.refreshToken : null,
      expiresAt: parseStoredDate(parsed.expiresAt),
      refreshTokenExpiresAt: parseStoredDate(parsed.refreshTokenExpiresAt),
    };
  } catch {
    return {
      accessToken: storedValue,
      refreshToken: null,
      expiresAt: null,
      refreshTokenExpiresAt: null,
    };
  }
}

function serializeGitHubStoredCredentials(
  credentials: GitHubStoredCredentials
): string {
  if (
    !credentials.refreshToken &&
    !credentials.expiresAt &&
    !credentials.refreshTokenExpiresAt
  ) {
    return credentials.accessToken;
  }

  return JSON.stringify({
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    expiresAt: credentials.expiresAt?.toISOString() ?? null,
    refreshTokenExpiresAt:
      credentials.refreshTokenExpiresAt?.toISOString() ?? null,
  });
}

export function serializeGitHubCredentialsForStorage(params: {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  refreshTokenExpiresAt?: string | null;
}): string {
  const tokenExpiresAt = parseStoredDate(params.tokenExpiresAt);
  const refreshTokenExpiresAt = parseStoredDate(params.refreshTokenExpiresAt);

  return serializeGitHubStoredCredentials({
    accessToken: params.accessToken,
    refreshToken: params.refreshToken ?? null,
    expiresAt: tokenExpiresAt,
    refreshTokenExpiresAt,
  });
}

function shouldRefreshToken(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return false;
  }

  return expiresAt.getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

async function refreshIntegrationTokenIfNeeded(
  integration: typeof channelGithubIntegrationsTable.$inferSelect
): Promise<GitHubStoredCredentials> {
  const credentials = parseGitHubStoredCredentials(integration.access_token);

  if (!credentials.refreshToken || !shouldRefreshToken(credentials.expiresAt)) {
    return credentials;
  }

  const refreshed = await refreshGitHubAccessToken(credentials.refreshToken);
  const updatedCredentials: GitHubStoredCredentials = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? credentials.refreshToken,
    expiresAt: refreshed.expiresAt,
    refreshTokenExpiresAt: refreshed.refreshTokenExpiresAt,
  };

  const serializedCredentials = serializeGitHubStoredCredentials(updatedCredentials);

  await db
    .update(channelGithubIntegrationsTable)
    .set({
      access_token: serializedCredentials,
    })
    .where(eq(channelGithubIntegrationsTable.id, integration.id));

  return updatedCredentials;
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

  const activeCredentials = await refreshIntegrationTokenIfNeeded(integration[0]);

  return new GitHubClient(activeCredentials.accessToken);
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
export async function exchangeCodeForToken(
  code: string
): Promise<GitHubTokenExchange> {
  const form = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    code,
    redirect_uri: GITHUB_REDIRECT_URI,
  });

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    const description =
      typeof data.error_description === "string"
        ? data.error_description
        : "unknown_error";
    throw new Error(`GitHub OAuth error: ${description}`);
  }

  if (!response.ok) {
    throw new Error(`GitHub OAuth error: ${response.status}`);
  }

  return parseTokenExchange(data);
}

export async function refreshGitHubAccessToken(
  refreshToken: string
): Promise<GitHubTokenExchange> {
  const form = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (data.error) {
    const description =
      typeof data.error_description === "string"
        ? data.error_description
        : "token_refresh_failed";
    throw new Error(`GitHub OAuth error: ${description}`);
  }

  if (!response.ok) {
    throw new Error(`GitHub OAuth error: ${response.status}`);
  }

  return parseTokenExchange(data);
}
