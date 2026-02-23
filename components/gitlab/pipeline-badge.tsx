"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock3,
  MinusCircle,
} from "lucide-react";
import { useGitLabPipelines } from "./use-gitlab-data";
import { GitLabPipelineCard } from "./pipeline-card";
import type { PipelineData } from "./types";
import { cn } from "@/lib/utils";

interface PipelineStatusBadgeProps {
  channelId: string;
  jwt: string;
}

function getStatusMeta(pipeline: PipelineData | null) {
  if (!pipeline) {
    return {
      label: "No pipelines",
      color: "text-muted-foreground bg-muted",
      Icon: Clock3,
    };
  }

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
        label: "Passing",
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
    case "skipped":
      return {
        label: "Canceled",
        color: "text-muted-foreground bg-muted",
        Icon: MinusCircle,
      };
    default:
      return {
        label: "Unknown",
        color: "text-muted-foreground bg-muted",
        Icon: Clock3,
      };
  }
}

export function PipelineStatusBadge({ channelId, jwt }: PipelineStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const { latest, project, isLoading, error, mutate, noPipelines, unauthorized } =
    useGitLabPipelines(channelId, jwt, 3, true);

  // Hide badge entirely when we can't show a valid pipeline state
  if (unauthorized || error || noPipelines) {
    return null;
  }

  const statusMeta = unauthorized
    ? {
        label: "Reconnect GitLab",
        color: "text-destructive bg-destructive/10",
        Icon: XCircle,
      }
    : getStatusMeta(latest);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          // Refresh when opening the popover
          void mutate();
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border transition-colors",
            open ? "bg-muted" : "bg-muted/60 hover:bg-muted",
            statusMeta.color
          )}
          title="Latest GitLab pipeline"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <statusMeta.Icon
              className={cn("h-4 w-4", statusMeta.spin && "animate-spin")}
            />
          )}
          <span>{isLoading ? "Loading..." : statusMeta.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        {unauthorized ? (
          <div className="p-3 text-sm text-muted-foreground w-72">
            GitLab token is invalid or expired. Please reconnect the
            integration.
          </div>
        ) : error ? (
          <div className="p-3 text-sm text-muted-foreground w-72">
            Failed to load pipelines
          </div>
        ) : isLoading ? (
          <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground w-72">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading latest pipeline...
          </div>
        ) : latest ? (
          <GitLabPipelineCard
            data={latest}
            projectPath={project?.path || ""}
          />
        ) : (
          <div className="p-3 text-sm text-muted-foreground w-72">
            {noPipelines
              ? "CI/CD is not enabled or no pipelines exist for this project."
              : "No pipelines yet"}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

