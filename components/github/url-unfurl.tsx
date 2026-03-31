"use client";

import { useMemo } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useGitHubData } from "./use-github-data";
import { GitHubIssueCard } from "./issue-card";
import { GitHubPRCard } from "./pr-card";
import { GitHubCommitCard } from "./commit-card";
import type {
  IssueData,
  PullRequestData,
  CommitData,
} from "./types";
import type { GitHubReference } from "@/lib/github-parser";

// Regex patterns for GitHub URLs
const GITHUB_URL_PATTERNS = {
  issue:
    /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/issues\/(\d+)/,
  pr: /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/,
  commit:
    /https?:\/\/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/commit\/([a-fA-F0-9]+)/,
};

interface GitHubUrlInfo {
  type: "issue" | "pr" | "commit";
  owner: string;
  repo: string;
  number?: number;
  sha?: string;
  url: string;
}

function parseGitHubUrl(url: string): GitHubUrlInfo | null {
  // Check for issue URL
  const issueMatch = url.match(GITHUB_URL_PATTERNS.issue);
  if (issueMatch) {
    return {
      type: "issue",
      owner: issueMatch[1],
      repo: issueMatch[2],
      number: parseInt(issueMatch[3], 10),
      url,
    };
  }

  // Check for PR URL
  const prMatch = url.match(GITHUB_URL_PATTERNS.pr);
  if (prMatch) {
    return {
      type: "pr",
      owner: prMatch[1],
      repo: prMatch[2],
      number: parseInt(prMatch[3], 10),
      url,
    };
  }

  // Check for commit URL
  const commitMatch = url.match(GITHUB_URL_PATTERNS.commit);
  if (commitMatch) {
    return {
      type: "commit",
      owner: commitMatch[1],
      repo: commitMatch[2],
      sha: commitMatch[3],
      url,
    };
  }

  return null;
}

export function extractGitHubUrls(content: string): GitHubUrlInfo[] {
  const urlRegex = /https?:\/\/github\.com\/[^\s]+/g;
  const matches = content.match(urlRegex) || [];

  const urls: GitHubUrlInfo[] = [];
  for (const match of matches) {
    const info = parseGitHubUrl(match);
    if (info) {
      // Avoid duplicates
      if (!urls.some((u) => u.url === info.url)) {
        urls.push(info);
      }
    }
  }

  return urls;
}

interface GitHubUrlUnfurlProps {
  url: GitHubUrlInfo;
  channelId: string;
  jwt: string;
}

function GitHubUrlUnfurl({ url, channelId, jwt }: GitHubUrlUnfurlProps) {
  const reference: GitHubReference = useMemo(() => {
    return {
      type: url.type,
      raw: url.url,
      start: 0,
      end: url.url.length,
      owner: url.owner,
      repo: url.repo,
      number: url.number,
      sha: url.sha,
    };
  }, [url]);

  const { data, isLoading, error } = useGitHubData({
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
        <img
          src="https://github.githubassets.com/favicons/favicon.svg"
          alt="GitHub"
          className="h-5 w-5"
        />
        <span className="text-sm text-muted-foreground truncate flex-1">
          {url.owner}/{url.repo}
          {url.number && ` #${url.number}`}
          {url.sha && ` ${url.sha.slice(0, 7)}`}
        </span>
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      {data.type === "issue" && (
        <GitHubIssueCard
          data={data.data as IssueData}
          repoOwner={url.owner}
          repoName={url.repo}
        />
      )}
      {data.type === "pr" && (
        <GitHubPRCard
          data={data.data as PullRequestData}
          repoOwner={url.owner}
          repoName={url.repo}
        />
      )}
      {data.type === "commit" && (
        <GitHubCommitCard
          data={data.data as CommitData}
          repoOwner={url.owner}
          repoName={url.repo}
        />
      )}
    </div>
  );
}

interface GitHubUrlUnfurlsProps {
  content: string;
  channelId: string;
  jwt: string;
  hasIntegration: boolean;
}

export function GitHubUrlUnfurls({
  content,
  channelId,
  jwt,
  hasIntegration,
}: GitHubUrlUnfurlsProps) {
  const urls = useMemo(() => {
    if (!hasIntegration) return [];
    return extractGitHubUrls(content);
  }, [content, hasIntegration]);

  if (urls.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {urls.slice(0, 3).map((url, index) => (
        <GitHubUrlUnfurl
          key={`${url.url}-${index}`}
          url={url}
          channelId={channelId}
          jwt={jwt}
        />
      ))}
      {urls.length > 3 && (
        <p className="text-xs text-muted-foreground">
          +{urls.length - 3} more GitHub links
        </p>
      )}
    </div>
  );
}

