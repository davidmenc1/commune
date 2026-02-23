import { db } from "@/app/db/db";
import { channelGitlabIntegrationsTable } from "@/app/db/schema";
import { eq } from "drizzle-orm";

// GitLab OAuth configuration
export const GITLAB_CLIENT_ID = process.env.GITLAB_CLIENT_ID!;
export const GITLAB_CLIENT_SECRET = process.env.GITLAB_CLIENT_SECRET!;
export const GITLAB_REDIRECT_URI =
  process.env.GITLAB_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/gitlab/callback`;

export const GITLAB_OAUTH_URL = "https://gitlab.com/oauth/authorize";
export const GITLAB_TOKEN_URL = "https://gitlab.com/oauth/token";
export const GITLAB_API_BASE = "https://gitlab.com/api/v4";

// Scopes needed for repo access
export const GITLAB_SCOPES = ["read_api", "read_user", "read_repository"].join(" ");

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  email: string | null;
  web_url: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  namespace: {
    id: number;
    name: string;
    path: string;
    avatar_url: string | null;
  };
  visibility: "private" | "internal" | "public";
  description: string | null;
  web_url: string;
  default_branch: string;
  avatar_url: string | null;
}

export interface GitLabIssue {
  iid: number;
  title: string;
  state: "opened" | "closed";
  description: string | null;
  web_url: string;
  author: {
    username: string;
    name: string;
    avatar_url: string;
  };
  labels: string[];
  assignees: Array<{
    username: string;
    name: string;
    avatar_url: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GitLabMergeRequest {
  iid: number;
  title: string;
  state: "opened" | "closed" | "merged" | "locked";
  description: string | null;
  web_url: string;
  author: {
    username: string;
    name: string;
    avatar_url: string;
  };
  labels: string[];
  assignees: Array<{
    username: string;
    name: string;
    avatar_url: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  source_branch: string;
  target_branch: string;
  sha: string;
  diff_refs?: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
  changes_count?: string;
}

export interface GitLabMergeRequestChanges {
  changes_count?: string;
  changes?: Array<{
    old_path: string;
    new_path: string;
    diff: string;
  }>;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  web_url: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    authored_date: string;
    web_url: string;
  };
  protected: boolean;
  default: boolean;
  web_url: string;
}

export interface GitLabBranchComparison {
  commit: GitLabCommit | null;
  commits: GitLabCommit[];
  diffs: Array<{
    old_path: string;
    new_path: string;
    diff: string;
  }>;
  compare_timeout: boolean;
  compare_same_ref: boolean;
}

export interface GitLabFileContent {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

export interface GitLabPipeline {
  id: number;
  iid: number;
  status: "created" | "waiting_for_resource" | "preparing" | "pending" | "running" | "success" | "failed" | "canceled" | "skipped" | "manual" | "scheduled";
  source: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  user?: {
    username: string;
    name: string;
    avatar_url: string;
  };
}

// Simple in-memory cache for GitLab API responses
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

export class GitLabClient {
  constructor(private accessToken: string) {}

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const cacheKey = `${this.accessToken}:${endpoint}`;
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${GITLAB_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  }

  async getUser(): Promise<GitLabUser> {
    return this.fetch<GitLabUser>("/user");
  }

  async getProjects(): Promise<GitLabProject[]> {
    return this.fetch<GitLabProject[]>("/projects?membership=true&per_page=100&order_by=updated_at");
  }

  async getProject(projectId: string): Promise<GitLabProject> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabProject>(`/projects/${encodedId}`);
  }

  async getIssue(
    projectId: string,
    issueIid: number
  ): Promise<GitLabIssue> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabIssue>(`/projects/${encodedId}/issues/${issueIid}`);
  }

  async getMergeRequest(
    projectId: string,
    mrIid: number
  ): Promise<GitLabMergeRequest> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabMergeRequest>(
      `/projects/${encodedId}/merge_requests/${mrIid}`
    );
  }

  async getMergeRequestChanges(
    projectId: string,
    mrIid: number
  ): Promise<GitLabMergeRequestChanges> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabMergeRequestChanges>(
      `/projects/${encodedId}/merge_requests/${mrIid}/changes`
    );
  }

  async getCommit(
    projectId: string,
    sha: string
  ): Promise<GitLabCommit> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabCommit>(`/projects/${encodedId}/repository/commits/${sha}`);
  }

  async getBranch(
    projectId: string,
    branch: string
  ): Promise<GitLabBranch> {
    const encodedId = encodeURIComponent(projectId);
    const encodedBranch = encodeURIComponent(branch);
    return this.fetch<GitLabBranch>(
      `/projects/${encodedId}/repository/branches/${encodedBranch}`
    );
  }

  async compareBranches(
    projectId: string,
    from: string,
    to: string
  ): Promise<GitLabBranchComparison> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabBranchComparison>(
      `/projects/${encodedId}/repository/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
  }

  async getFileContent(
    projectId: string,
    path: string,
    ref?: string
  ): Promise<GitLabFileContent> {
    const encodedId = encodeURIComponent(projectId);
    const encodedPath = encodeURIComponent(path);
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    return this.fetch<GitLabFileContent>(
      `/projects/${encodedId}/repository/files/${encodedPath}${query}`
    );
  }

  async getRecentCommits(
    projectId: string,
    count: number = 5
  ): Promise<GitLabCommit[]> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabCommit[]>(
      `/projects/${encodedId}/repository/commits?per_page=${count}`
    );
  }

  async getOpenMergeRequests(
    projectId: string,
    count: number = 5
  ): Promise<GitLabMergeRequest[]> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabMergeRequest[]>(
      `/projects/${encodedId}/merge_requests?state=opened&per_page=${count}`
    );
  }

  async getOpenIssues(
    projectId: string,
    count: number = 5
  ): Promise<GitLabIssue[]> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabIssue[]>(
      `/projects/${encodedId}/issues?state=opened&per_page=${count}`
    );
  }

  async getPipelines(
    projectId: string,
    count: number = 5
  ): Promise<GitLabPipeline[]> {
    const encodedId = encodeURIComponent(projectId);
    return this.fetch<GitLabPipeline[]>(
      `/projects/${encodedId}/pipelines?per_page=${count}`
    );
  }

  async getLatestPipeline(
    projectId: string
  ): Promise<GitLabPipeline | null> {
    const pipelines = await this.getPipelines(projectId, 1);
    return pipelines[0] || null;
  }
}

// Helper to get GitLab client for a channel
export async function getGitLabClientForChannel(
  channelId: string
): Promise<GitLabClient | null> {
  const integration = await db
    .select()
    .from(channelGitlabIntegrationsTable)
    .where(eq(channelGitlabIntegrationsTable.channel_id, channelId))
    .limit(1);

  if (integration.length === 0) {
    return null;
  }

  return new GitLabClient(integration[0].access_token);
}

// Helper to get integration for a channel
export async function getChannelGitLabIntegration(channelId: string) {
  const integration = await db
    .select()
    .from(channelGitlabIntegrationsTable)
    .where(eq(channelGitlabIntegrationsTable.channel_id, channelId))
    .limit(1);

  return integration[0] || null;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch(GITLAB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITLAB_CLIENT_ID,
      client_secret: GITLAB_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: GITLAB_REDIRECT_URI,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitLab OAuth error: ${data.error_description}`);
  }

  return data.access_token;
}

