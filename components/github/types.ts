export interface GitHubLabel {
  name: string;
  color: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
}

export interface IssueData {
  number: number;
  title: string;
  state: "open" | "closed";
  body: string | null;
  html_url: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface PullRequestData {
  number: number;
  title: string;
  state: "open" | "closed";
  body: string | null;
  html_url: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  assignees: GitHubUser[];
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

export interface CommitData {
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
  author: GitHubUser | null;
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

export interface BranchData {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface BranchWithComparison {
  branch: BranchData;
  comparison?: {
    status: string;
    ahead_by: number;
    behind_by: number;
    total_commits: number;
  };
  defaultBranch?: string;
}

export interface FileData {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
  html_url: string;
}

export type WorkflowRunStatus = "queued" | "in_progress" | "completed";
export type WorkflowRunConclusion =
  | "action_required"
  | "cancelled"
  | "failure"
  | "neutral"
  | "success"
  | "skipped"
  | "stale"
  | "timed_out"
  | null;

export interface WorkflowRunData {
  id: number;
  name: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
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
  actor?: GitHubUser | null;
  head_commit?: {
    id?: string;
    message?: string;
  } | null;
}

export type GitHubDataResponse =
  | { type: "issue"; data: IssueData }
  | { type: "pr"; data: PullRequestData }
  | { type: "commit"; data: CommitData }
  | { type: "file"; data: FileData }
  | { type: "branch"; data: BranchWithComparison }
  | { type: "build"; data: WorkflowRunData }
  | { error: true };

