"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  GitPullRequest,
  GitPullRequestClosed,
  GitMerge,
  GitPullRequestDraft,
  FileCode,
} from "lucide-react";
import type { MergeRequestData } from "./types";

interface GitLabMRCardProps {
  data: MergeRequestData;
  projectPath?: string;
}

export function GitLabMRCard({ data, projectPath }: GitLabMRCardProps) {
  const { icon: StateIcon, color } = getMRState(data);
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
            href={data.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
          >
            {data.title}
          </a>
          <p className="text-xs text-muted-foreground mt-0.5">
            {projectPath && (
              <span className="text-muted-foreground/70">
                {projectPath}
              </span>
            )}
            <span className="mx-1">!{data.iid}</span>
            <span className="text-muted-foreground/70">opened {timeAgo}</span>
          </p>
        </div>
      </div>

      {/* Branch info */}
      <div className="flex items-center gap-1.5 text-xs">
        <Badge variant="outline" className="font-mono text-[10px] px-1.5">
          {data.target_branch}
        </Badge>
        <span className="text-muted-foreground">←</span>
        <Badge variant="outline" className="font-mono text-[10px] px-1.5">
          {data.source_branch}
        </Badge>
      </div>

      {/* Stats */}
      {data.changes_count && (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <FileCode className="h-3 w-3" />
            {data.changes_count} file{data.changes_count !== "1" && "s"} changed
          </span>
        </div>
      )}

      {/* Labels */}
      {data.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.labels.slice(0, 4).map((label) => (
            <Badge
              key={label}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {label}
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
            <AvatarImage src={data.author.avatar_url} />
            <AvatarFallback className="text-[9px]">
              {data.author.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            {data.author.username}
          </span>
        </div>

        {data.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {data.assignees.slice(0, 3).map((assignee) => (
              <Avatar
                key={assignee.username}
                className="h-5 w-5 border-2 border-background"
              >
                <AvatarImage src={assignee.avatar_url} />
                <AvatarFallback className="text-[9px]">
                  {assignee.username.slice(0, 2).toUpperCase()}
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

function getMRState(mr: MergeRequestData): {
  icon: typeof GitPullRequest;
  color: string;
} {
  if (mr.state === "merged") {
    return { icon: GitMerge, color: "text-purple-500" };
  }
  if (mr.draft) {
    return { icon: GitPullRequestDraft, color: "text-muted-foreground" };
  }
  if (mr.state === "closed") {
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

