"use client";

import { useMemo } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useGitLabData } from "./use-gitlab-data";
import { GitLabIssueCard } from "./issue-card";
import { GitLabMRCard } from "./mr-card";
import { GitLabCommitCard } from "./commit-card";
import type {
  IssueData,
  MergeRequestData,
  CommitData,
} from "./types";
import type { GitLabReference } from "@/lib/gitlab-parser";

// Regex patterns for GitLab URLs
const GITLAB_URL_PATTERNS = {
  issue:
    /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/issues\/(\d+)/,
  mr: /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/merge_requests\/(\d+)/,
  commit:
    /https?:\/\/gitlab\.com\/([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+)\/-\/commit\/([a-fA-F0-9]+)/,
};

interface GitLabUrlInfo {
  type: "issue" | "mr" | "commit";
  projectPath: string;
  number?: number;
  sha?: string;
  url: string;
}

function parseProjectPath(path: string): { group?: string; project?: string } {
  const parts = path.split("/");
  if (parts.length >= 2) {
    const project = parts.pop()!;
    const group = parts.join("/");
    return { group, project };
  }
  return {};
}

function parseGitLabUrl(url: string): GitLabUrlInfo | null {
  // Check for issue URL
  const issueMatch = url.match(GITLAB_URL_PATTERNS.issue);
  if (issueMatch) {
    return {
      type: "issue",
      projectPath: issueMatch[1],
      number: parseInt(issueMatch[2], 10),
      url,
    };
  }

  // Check for MR URL
  const mrMatch = url.match(GITLAB_URL_PATTERNS.mr);
  if (mrMatch) {
    return {
      type: "mr",
      projectPath: mrMatch[1],
      number: parseInt(mrMatch[2], 10),
      url,
    };
  }

  // Check for commit URL
  const commitMatch = url.match(GITLAB_URL_PATTERNS.commit);
  if (commitMatch) {
    return {
      type: "commit",
      projectPath: commitMatch[1],
      sha: commitMatch[2],
      url,
    };
  }

  return null;
}

export function extractGitLabUrls(content: string): GitLabUrlInfo[] {
  const urlRegex = /https?:\/\/gitlab\.com\/[^\s]+/g;
  const matches = content.match(urlRegex) || [];

  const urls: GitLabUrlInfo[] = [];
  for (const match of matches) {
    const info = parseGitLabUrl(match);
    if (info) {
      // Avoid duplicates
      if (!urls.some((u) => u.url === info.url)) {
        urls.push(info);
      }
    }
  }

  return urls;
}

interface GitLabUrlUnfurlProps {
  url: GitLabUrlInfo;
  channelId: string;
  jwt: string;
}

function GitLabUrlUnfurl({ url, channelId, jwt }: GitLabUrlUnfurlProps) {
  const { group, project } = parseProjectPath(url.projectPath);
  
  const reference: GitLabReference = useMemo(() => {
    return {
      type: url.type,
      raw: url.url,
      start: 0,
      end: url.url.length,
      group,
      project,
      number: url.number,
      sha: url.sha,
    };
  }, [url, group, project]);

  const { data, isLoading, error } = useGitLabData({
    channelId,
    reference,
    jwt,
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading preview...</span>
      </div>
    );
  }

  if (error || !data || "error" in data) {
    // Return a simple link preview for failed loads
    return (
      <a
        href={url.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#FC6D26]" fill="currentColor">
          <path d="M4.845.904c-.435 0-.82.28-.955.692C2.639 5.449 1.246 9.728.07 13.335a1.437 1.437 0 00.522 1.607l11.071 8.045c.2.145.472.144.67-.004l11.073-8.04a1.436 1.436 0 00.522-1.61c-1.285-3.942-2.683-8.256-3.817-11.746a1.004 1.004 0 00-.957-.684.987.987 0 00-.949.69l-2.405 7.408H8.203l-2.41-7.408a.987.987 0 00-.942-.69h-.006z" />
        </svg>
        <span className="text-sm text-muted-foreground truncate flex-1">
          {url.projectPath}
          {url.number && (url.type === "mr" ? ` !${url.number}` : ` #${url.number}`)}
          {url.sha && ` ${url.sha.slice(0, 7)}`}
        </span>
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      {data.type === "issue" && (
        <GitLabIssueCard
          data={data.data as IssueData}
          projectPath={url.projectPath}
        />
      )}
      {data.type === "mr" && (
        <GitLabMRCard
          data={data.data as MergeRequestData}
          projectPath={url.projectPath}
        />
      )}
      {data.type === "commit" && (
        <GitLabCommitCard
          data={data.data as CommitData}
          projectPath={url.projectPath}
        />
      )}
    </div>
  );
}

interface GitLabUrlUnfurlsProps {
  content: string;
  channelId: string;
  jwt: string;
  hasIntegration: boolean;
}

export function GitLabUrlUnfurls({
  content,
  channelId,
  jwt,
  hasIntegration,
}: GitLabUrlUnfurlsProps) {
  const urls = useMemo(() => {
    if (!hasIntegration) return [];
    return extractGitLabUrls(content);
  }, [content, hasIntegration]);

  if (urls.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {urls.slice(0, 3).map((url, index) => (
        <GitLabUrlUnfurl
          key={`${url.url}-${index}`}
          url={url}
          channelId={channelId}
          jwt={jwt}
        />
      ))}
      {urls.length > 3 && (
        <p className="text-xs text-muted-foreground">
          +{urls.length - 3} more GitLab links
        </p>
      )}
    </div>
  );
}

