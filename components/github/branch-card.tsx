"use client";

import { GitBranch, ArrowUp, ArrowDown, Shield, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { BranchWithComparison } from "./types";

interface GitHubBranchCardProps {
  data: BranchWithComparison;
  repoOwner?: string;
  repoName?: string;
}

export function GitHubBranchCard({
  data,
  repoOwner,
  repoName,
}: GitHubBranchCardProps) {
  const [copied, setCopied] = useState(false);
  const shortSha = data.branch.commit.sha.slice(0, 7);

  const handleCopyBranch = () => {
    navigator.clipboard.writeText(data.branch.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-80 p-3 space-y-3">
      {/* Header with branch icon and name */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-muted-foreground">
          <GitBranch className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyBranch}
              className="font-mono text-sm font-medium hover:text-primary transition-colors"
            >
              {data.branch.name}
            </button>
            {copied ? (
              <Check className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            {data.branch.protected && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 gap-0.5"
              >
                <Shield className="h-2.5 w-2.5" />
                Protected
              </Badge>
            )}
          </div>
          {repoOwner && repoName && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {repoOwner}/{repoName}
            </p>
          )}
        </div>
      </div>

      {/* Latest commit */}
      <div className="text-xs">
        <span className="text-muted-foreground">Latest commit: </span>
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
          {shortSha}
        </span>
      </div>

      {/* Comparison with default branch */}
      {data.comparison && data.defaultBranch && (
        <div className="rounded-md border p-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            Compared to{" "}
            <span className="font-mono font-medium">{data.defaultBranch}</span>
          </p>
          <div className="flex items-center gap-4">
            {data.comparison.ahead_by > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <ArrowUp className="h-3 w-3" />
                <span>
                  {data.comparison.ahead_by} commit
                  {data.comparison.ahead_by !== 1 && "s"} ahead
                </span>
              </div>
            )}
            {data.comparison.behind_by > 0 && (
              <div className="flex items-center gap-1 text-xs text-orange-500">
                <ArrowDown className="h-3 w-3" />
                <span>
                  {data.comparison.behind_by} commit
                  {data.comparison.behind_by !== 1 && "s"} behind
                </span>
              </div>
            )}
            {data.comparison.ahead_by === 0 &&
              data.comparison.behind_by === 0 && (
                <span className="text-xs text-muted-foreground">
                  Up to date
                </span>
              )}
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className="flex items-center justify-between pt-1 border-t">
        <Badge
          variant={data.branch.protected ? "secondary" : "outline"}
          className="text-[10px]"
        >
          {data.branch.protected ? "Protected branch" : "Unprotected"}
        </Badge>
        {data.comparison && (
          <span className="text-[10px] text-muted-foreground">
            {data.comparison.total_commits} total commits
          </span>
        )}
      </div>
    </div>
  );
}

