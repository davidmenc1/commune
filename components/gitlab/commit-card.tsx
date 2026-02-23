"use client";

import { GitCommit, Plus, Minus, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { CommitData } from "./types";

interface GitLabCommitCardProps {
  data: CommitData;
  projectPath?: string;
}

export function GitLabCommitCard({
  data,
  projectPath,
}: GitLabCommitCardProps) {
  const [copied, setCopied] = useState(false);
  const shortSha = data.short_id;
  const timeAgo = getTimeAgo(new Date(data.authored_date));
  const [title, ...bodyLines] = data.message.split("\n");
  const body = bodyLines.join("\n").trim();

  const handleCopySha = () => {
    navigator.clipboard.writeText(data.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 p-3 space-y-3">
      {/* Header with commit icon and SHA */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-muted-foreground">
          <GitCommit className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={data.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
          >
            {title}
          </a>
          <div className="flex items-center gap-2 mt-0.5">
            {projectPath && (
              <span className="text-xs text-muted-foreground/70">
                {projectPath}
              </span>
            )}
            <button
              onClick={handleCopySha}
              className="flex items-center gap-1 text-xs font-mono bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors"
            >
              {shortSha}
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Commit body preview */}
      {body && (
        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
          {body.slice(0, 150)}
          {body.length > 150 && "..."}
        </p>
      )}

      {/* Stats */}
      {data.stats && (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <Plus className="h-3 w-3" />
            {data.stats.additions}
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <Minus className="h-3 w-3" />
            {data.stats.deletions}
          </span>
        </div>
      )}

      {/* Footer with author */}
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[9px] text-muted-foreground">
              {data.author_name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {data.author_name}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">{timeAgo}</span>
      </div>
    </div>
  );
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

