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
import { useGitHubBuilds } from "./use-github-data";
import { GitHubBuildCard } from "./build-card";
import type { WorkflowRunData } from "./types";
import { cn } from "@/lib/utils";

interface BuildStatusBadgeProps {
  channelId: string;
  jwt: string;
}

function getStatusMeta(run: WorkflowRunData | null) {
  if (!run) {
    return {
      label: "No builds",
      color: "text-muted-foreground bg-muted",
      Icon: Clock3,
    };
  }

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

  switch (run.conclusion) {
    case "success":
      return {
        label: "Passing",
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

export function BuildStatusBadge({ channelId, jwt }: BuildStatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const { latest, repo, isLoading, error, mutate, noBuilds, unauthorized } =
    useGitHubBuilds(channelId, jwt, 3, true);

  // Hide badge entirely when we can't show a valid build state
  if (unauthorized || error || noBuilds) {
    return null;
  }

  const statusMeta = unauthorized
    ? {
        label: "Reconnect GitHub",
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
          title="Latest GitHub Actions run"
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
            GitHub token is invalid or expired. Please reconnect the
            integration.
          </div>
        ) : error ? (
          <div className="p-3 text-sm text-muted-foreground w-72">
            Failed to load builds
          </div>
        ) : isLoading ? (
          <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground w-72">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading latest build...
          </div>
        ) : latest ? (
          <GitHubBuildCard
            data={latest}
            repoOwner={repo?.owner || "repo"}
            repoName={repo?.name || ""}
          />
        ) : (
          <div className="p-3 text-sm text-muted-foreground w-72">
            {noBuilds
              ? "GitHub Actions is not enabled or no workflows exist for this repository."
              : "No workflow runs yet"}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
