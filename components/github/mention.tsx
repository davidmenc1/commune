"use client";

import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2 } from "lucide-react";
import type { GitHubReference } from "@/lib/github-parser";
import { formatReferenceDisplay } from "@/lib/github-parser";
import { useGitHubData, useGitHubBuilds } from "./use-github-data";
import { GitHubIssueCard } from "./issue-card";
import { GitHubPRCard } from "./pr-card";
import { GitHubCommitCard } from "./commit-card";
import { GitHubFileCard } from "./file-card";
import { GitHubBranchCard } from "./branch-card";
import { GitHubBuildCard } from "./build-card";
import type {
  IssueData,
  PullRequestData,
  CommitData,
  FileData,
  BranchWithComparison,
  WorkflowRunData,
} from "./types";

interface GitHubMentionProps {
  reference: GitHubReference;
  channelId: string;
  jwt: string;
  children?: ReactNode;
}

export function GitHubMention({
  reference,
  channelId,
  jwt,
  children,
}: GitHubMentionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isBuildReference = reference.type === "build";
  const { data, isLoading, error } = useGitHubData({
    channelId,
    reference,
    jwt,
    enabled: isOpen,
  });
  const {
    latest: build,
    repo: buildRepo,
    isLoading: isLoadingBuild,
    error: buildError,
    noBuilds: buildNoBuilds,
    unauthorized: buildUnauthorized,
  } = useGitHubBuilds(channelId, jwt, 1, isOpen && isBuildReference);

  const displayText = children || formatReferenceDisplay(reference);

  const getTypeColor = () => {
    switch (reference.type) {
      case "issue":
        return "text-green-600 hover:text-green-500 bg-green-500/10 hover:bg-green-500/20";
      case "pr":
        return "text-purple-600 hover:text-purple-500 bg-purple-500/10 hover:bg-purple-500/20";
      case "commit":
        return "text-orange-600 hover:text-orange-500 bg-orange-500/10 hover:bg-orange-500/20";
      case "file":
        return "text-blue-600 hover:text-blue-500 bg-blue-500/10 hover:bg-blue-500/20";
      case "branch":
        return "text-cyan-600 hover:text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20";
      default:
        return "text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20";
    }
  };

  const renderCard = () => {
    if (isBuildReference) {
      if (isLoadingBuild) {
        return (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        );
      }

      if (buildError || !build) {
        return (
          <div className="p-4 text-sm text-muted-foreground max-w-xs">
            {buildUnauthorized
              ? "GitHub token is invalid or expired. Please reconnect."
              : buildNoBuilds
                ? "GitHub Actions is not enabled or no workflows exist for this repository."
                : "No recent builds found for this repository."}
            <p className="text-xs mt-1 opacity-70">{reference.raw}</p>
          </div>
        );
      }

      return (
        <GitHubBuildCard
          data={build as WorkflowRunData}
          repoOwner={buildRepo?.owner || ""}
          repoName={buildRepo?.name || ""}
        />
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error || !data || "error" in data) {
      // Show a friendly message for not found items
      const notFoundMessage =
        reference.type === "file"
          ? "File not found in connected repository"
          : reference.type === "branch"
            ? "Branch not found"
            : reference.type === "commit"
              ? "Commit not found"
              : "Not found in connected repository";

      return (
        <div className="p-4 text-sm text-muted-foreground max-w-xs">
          <p>{notFoundMessage}</p>
          <p className="text-xs mt-1 opacity-70">{reference.raw}</p>
        </div>
      );
    }

    switch (data.type) {
      case "issue":
        return (
          <GitHubIssueCard
            data={data.data as IssueData}
            repoOwner={reference.owner}
            repoName={reference.repo}
          />
        );
      case "pr":
        return (
          <GitHubPRCard
            data={data.data as PullRequestData}
            repoOwner={reference.owner}
            repoName={reference.repo}
          />
        );
      case "commit":
        return (
          <GitHubCommitCard
            data={data.data as CommitData}
            repoOwner={reference.owner}
            repoName={reference.repo}
          />
        );
      case "file":
        return (
          <GitHubFileCard
            data={data.data as FileData}
            line={reference.line}
            repoOwner={reference.owner}
            repoName={reference.repo}
          />
        );
      case "branch":
        return (
          <GitHubBranchCard
            data={data.data as BranchWithComparison}
            repoOwner={reference.owner}
            repoName={reference.repo}
          />
        );
      default:
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Unknown reference type
          </div>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center rounded px-1 py-0.5 text-sm font-medium transition-colors ${getTypeColor()}`}
        >
          {displayText}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="top"
        sideOffset={5}
      >
        {renderCard()}
      </PopoverContent>
    </Popover>
  );
}
