export interface GitLabLabel {
  name: string;
  color?: string;
}

export interface GitLabUser {
  username: string;
  name: string;
  avatar_url: string;
}

export interface IssueData {
  iid: number;
  title: string;
  state: "opened" | "closed";
  description: string | null;
  web_url: string;
  author: GitLabUser;
  labels: string[];
  assignees: GitLabUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface MergeRequestData {
  iid: number;
  title: string;
  state: "opened" | "closed" | "merged" | "locked";
  description: string | null;
  web_url: string;
  author: GitLabUser;
  labels: string[];
  assignees: GitLabUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  draft: boolean;
  source_branch: string;
  target_branch: string;
  sha: string;
  changes_count?: string;
}

export interface CommitData {
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

export interface BranchData {
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

export interface BranchWithComparison {
  branch: BranchData;
  comparison?: {
    commits: Array<{
      id: string;
      short_id: string;
      title: string;
    }>;
    compare_same_ref: boolean;
  };
  defaultBranch?: string;
}

export interface FileData {
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

export type PipelineStatus = 
  | "created" 
  | "waiting_for_resource" 
  | "preparing" 
  | "pending" 
  | "running" 
  | "success" 
  | "failed" 
  | "canceled" 
  | "skipped" 
  | "manual" 
  | "scheduled";

export interface PipelineData {
  id: number;
  iid: number;
  status: PipelineStatus;
  source: string;
  ref: string;
  sha: string;
  web_url: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  user?: GitLabUser;
}

export type GitLabDataResponse =
  | { type: "issue"; data: IssueData }
  | { type: "mr"; data: MergeRequestData }
  | { type: "commit"; data: CommitData }
  | { type: "file"; data: FileData }
  | { type: "branch"; data: BranchWithComparison }
  | { type: "pipeline"; data: PipelineData }
  | { error: true };

