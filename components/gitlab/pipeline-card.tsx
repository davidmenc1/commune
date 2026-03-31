"use client";

import { GitBranch, GitCommit, ExternalLink, Clock3, Loader2, CheckCircle2, XCircle, MinusCircle, PauseCircle } from "lucide-react";
import type { PipelineData } from "./types";
import { cn } from "@/lib/utils";

interface GitLabPipelineCardProps {
  data: PipelineData;
  projectPath: string;
}

function getStatusMeta(pipeline: PipelineData) {
  switch (pipeline.status) {
    case "created":
    case "waiting_for_resource":
    case "preparing":
    case "pending":
      return {
        label: "Pending",
        color: "text-muted-foreground bg-muted",
        Icon: Clock3,
      };
    case "running":
      return {
        label: "Running",
        color: "text-amber-600 bg-amber-500/15",
        Icon: Loader2,
        spin: true,
      };
    case "success":
      return {
        label: "Passed",
        color: "text-emerald-600 bg-emerald-500/15",
        Icon: CheckCircle2,
      };
    case "failed":
      return {
        label: "Failed",
        color: "text-destructive bg-destructive/10",
        Icon: XCircle,
      };
    case "canceled":
      return {
        label: "Canceled",
        color: "text-muted-foreground bg-muted",
        Icon: MinusCircle,
      };
    case "skipped":
      return {
        label: "Skipped",
        color: "text-muted-foreground bg-muted",
        Icon: MinusCircle,
      };
    case "manual":
      return {
        label: "Manual",
        color: "text-blue-600 bg-blue-500/15",
        Icon: PauseCircle,
      };
    case "scheduled":
      return {
        label: "Scheduled",
        color: "text-muted-foreground bg-muted",
        Icon: Clock3,
      };
    default:
      return {
        label: "Unknown",
        color: "text-muted-foreground bg-muted",
        Icon: Clock3,
      };
  }
}

function formatDuration(pipeline: PipelineData) {
  if (!pipeline.started_at || !pipeline.finished_at) return null;
  const start = new Date(pipeline.started_at).getTime();
  const end = new Date(pipeline.finished_at).getTime();
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

export function GitLabPipelineCard({ data, projectPath }: GitLabPipelineCardProps) {
  const statusMeta = getStatusMeta(data);
  const duration = formatDuration(data);

  return (
    <div className="w-80 rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start gap-2 border-b p-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{projectPath}</p>
          <p className="font-semibold text-sm leading-tight truncate">
            Pipeline #{data.iid}
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
            {duration && (
              <span className="text-[11px] text-muted-foreground" title="Duration">
                • {duration}
              </span>
            )}
          </div>
        </div>
        <a
          href={data.web_url}
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
          <span className="truncate">{data.ref}</span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <GitCommit className="h-4 w-4 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-foreground font-mono text-xs">
              {data.sha.slice(0, 7)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>
            {data.user?.username ? `Triggered by ${data.user.username}` : "Triggered"} • {data.source}
          </span>
        </div>
      </div>
    </div>
  );
}

