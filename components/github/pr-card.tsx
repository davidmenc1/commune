"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequest,
  GitPullRequestClosed,
  GitMerge,
  GitPullRequestDraft,
  Plus,
  Minus,
  FileCode,
} from "lucide-react";
import type { PullRequestData } from "./types";

interface GitHubPRCardProps {
  data: PullRequestData;
  repoOwner?: string;
  repoName?: string;
}

export function GitHubPRCard({ data, repoOwner, repoName }: GitHubPRCardProps) {
  const { icon: StateIcon, color } = getPRState(data);
  const timeAgo = getTimeAgo(new Date(data.created_at));

  return (
    <div className="w-80 p-3 space-y-3">
      {/* Header with state icon and number */}
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 ${color}`}>
          <StateIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={data.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
          >
            {data.title}
          </a>
          <p className="text-xs text-muted-foreground mt-0.5">
            {repoOwner && repoName && (
              <span className="text-muted-foreground/70">
                {repoOwner}/{repoName}
              </span>
            )}
            <span className="mx-1">#{data.number}</span>
            <span className="text-muted-foreground/70">opened {timeAgo}</span>
          </p>
        </div>
      </div>

      {/* Branch info */}
      <div className="flex items-center gap-1.5 text-xs">
        <Badge variant="outline" className="font-mono text-[10px] px-1.5">
          {data.base.ref}
        </Badge>
        <span className="text-muted-foreground">←</span>
        <Badge variant="outline" className="font-mono text-[10px] px-1.5">
          {data.head.ref}
        </Badge>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-green-600">
          <Plus className="h-3 w-3" />
          {data.additions}
        </span>
        <span className="flex items-center gap-1 text-red-500">
          <Minus className="h-3 w-3" />
          {data.deletions}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <FileCode className="h-3 w-3" />
          {data.changed_files} file{data.changed_files !== 1 && "s"}
        </span>
      </div>

      {/* Labels */}
      {data.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.labels.slice(0, 4).map((label) => (
            <Badge
              key={label.name}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
              style={{
                backgroundColor: `#${label.color}20`,
                color: getContrastColor(label.color),
                borderColor: `#${label.color}40`,
              }}
            >
              {label.name}
            </Badge>
          ))}
          {data.labels.length > 4 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{data.labels.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Footer with author and assignees */}
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5">
            <AvatarImage src={data.user.avatar_url} />
            <AvatarFallback className="text-[9px]">
              {data.user.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {data.user.login}
          </span>
        </div>

        {data.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {data.assignees.slice(0, 3).map((assignee) => (
              <Avatar
                key={assignee.login}
                className="h-5 w-5 border-2 border-background"
              >
                <AvatarImage src={assignee.avatar_url} />
                <AvatarFallback className="text-[9px]">
                  {assignee.login.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {data.assignees.length > 3 && (
              <span className="text-[10px] text-muted-foreground ml-2">
                +{data.assignees.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getPRState(pr: PullRequestData): {
  icon: typeof GitPullRequest;
  color: string;
} {
  if (pr.merged) {
    return { icon: GitMerge, color: "text-purple-500" };
  }
  if (pr.draft) {
    return { icon: GitPullRequestDraft, color: "text-muted-foreground" };
  }
  if (pr.state === "closed") {
    return { icon: GitPullRequestClosed, color: "text-red-500" };
  }
  return { icon: GitPullRequest, color: "text-green-500" };
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

