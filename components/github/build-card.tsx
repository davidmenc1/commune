"use client";

import { GitBranch, GitCommit, ExternalLink, Clock3, Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { WorkflowRunData } from "./types";
import { cn } from "@/lib/utils";

interface GitHubBuildCardProps {
  data: WorkflowRunData;
  repoOwner: string;
  repoName: string;
}

function getStatusMeta(run: WorkflowRunData) {
  if (run.status === "queued") {
    return {
      label: "Queued",
      color: "text-muted-foreground bg-muted",
      Icon: Clock3,
    };
  }
  if (run.status === "in_progress") {
    return {
      label: "In progress",
      color: "text-amber-600 bg-amber-500/15",
      Icon: Loader2,
      spin: true,
    };
  }

  // completed
  switch (run.conclusion) {
    case "success":
      return {
        label: "Succeeded",
        color: "text-emerald-600 bg-emerald-500/15",
        Icon: CheckCircle2,
      };
    case "failure":
    case "timed_out":
      return {
        label: "Failed",
        color: "text-destructive bg-destructive/10",
        Icon: XCircle,
      };
    case "cancelled":
    case "stale":
      return {
        label: "Cancelled",
        color: "text-muted-foreground bg-muted",
        Icon: MinusCircle,
      };
    default:
      return {
        label: "Completed",
        color: "text-muted-foreground bg-muted",
        Icon: CheckCircle2,
      };
  }
}

function formatDuration(run: WorkflowRunData) {
  if (!run.run_started_at || !run.updated_at) return null;
  const start = new Date(run.run_started_at).getTime();
  const end = new Date(run.updated_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m${remainingSeconds ? ` ${remainingSeconds}s` : ""}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes ? ` ${remainingMinutes}m` : ""}`;
}

export function GitHubBuildCard({ data, repoOwner, repoName }: GitHubBuildCardProps) {
  const statusMeta = getStatusMeta(data);
  const duration = formatDuration(data);
  const title = data.display_title || data.name;
  const repoLabel =
    repoOwner && repoName ? `${repoOwner}/${repoName}` : repoOwner || "repository";

  return (
    <div className="w-80 rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start gap-2 border-b p-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{repoLabel}</p>
          <p className="font-semibold text-sm leading-tight truncate" title={title}>
            {title}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                statusMeta.color
              )}
            >
              <statusMeta.Icon className={cn("h-3.5 w-3.5", statusMeta.spin && "animate-spin")} />
              {statusMeta.label}
            </span>
            <span className="text-[11px] text-muted-foreground">Run #{data.run_number}</span>
            {duration && (
              <span className="text-[11px] text-muted-foreground" title="Duration">
                • {duration}
              </span>
            )}
          </div>
        </div>
        <a
          href={data.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="p-3 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GitBranch className="h-4 w-4" />
          <span className="truncate">{data.head_branch}</span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <GitCommit className="h-4 w-4 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {data.head_sha.slice(0, 7)}
            </p>
            {data.head_commit?.message && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {data.head_commit.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>
            Triggered by {data.actor?.login || "unknown"} • {data.event}
          </span>
        </div>
      </div>
    </div>
  );
}


