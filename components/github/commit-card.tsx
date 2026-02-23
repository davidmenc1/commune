"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitCommit, Plus, Minus, FileCode, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { CommitData } from "./types";

interface GitHubCommitCardProps {
  data: CommitData;
  repoOwner?: string;
  repoName?: string;
}

export function GitHubCommitCard({
  data,
  repoOwner,
  repoName,
}: GitHubCommitCardProps) {
  const [copied, setCopied] = useState(false);
  const shortSha = data.sha.slice(0, 7);
  const timeAgo = getTimeAgo(new Date(data.commit.author.date));
  const [title, ...bodyLines] = data.commit.message.split("\n");
  const body = bodyLines.join("\n").trim();

  const handleCopySha = () => {
    navigator.clipboard.writeText(data.sha);
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
            href={data.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
          >
            {title}
          </a>
          <div className="flex items-center gap-2 mt-0.5">
            {repoOwner && repoName && (
              <span className="text-xs text-muted-foreground/70">
                {repoOwner}/{repoName}
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
          {data.files && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <FileCode className="h-3 w-3" />
              {data.files.length} file{data.files.length !== 1 && "s"}
            </span>
          )}
        </div>
      )}

      {/* Changed files preview */}
      {data.files && data.files.length > 0 && (
        <div className="space-y-1">
          {data.files.slice(0, 3).map((file) => (
            <div
              key={file.filename}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  file.status === "added"
                    ? "bg-green-500"
                    : file.status === "removed"
                      ? "bg-red-500"
                      : "bg-yellow-500"
                }`}
              />
              <span className="font-mono text-muted-foreground truncate flex-1">
                {file.filename}
              </span>
              <span className="text-muted-foreground/60">
                +{file.additions} -{file.deletions}
              </span>
            </div>
          ))}
          {data.files.length > 3 && (
            <p className="text-[10px] text-muted-foreground">
              +{data.files.length - 3} more files
            </p>
          )}
        </div>
      )}

      {/* Footer with author */}
      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-1.5">
          {data.author ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={data.author.avatar_url} />
              <AvatarFallback className="text-[9px]">
                {data.author.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground">
                {data.commit.author.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {data.author?.login || data.commit.author.name}
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

