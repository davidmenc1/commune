"use client";

import { useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2 } from "lucide-react";
import type { GitLabReference } from "@/lib/gitlab-parser";
import { formatReferenceDisplay } from "@/lib/gitlab-parser";
import { useGitLabData, useGitLabPipelines } from "./use-gitlab-data";
import { GitLabIssueCard } from "./issue-card";
import { GitLabMRCard } from "./mr-card";
import { GitLabCommitCard } from "./commit-card";
import { GitLabFileCard } from "./file-card";
import { GitLabBranchCard } from "./branch-card";
import { GitLabPipelineCard } from "./pipeline-card";
import type {
  IssueData,
  MergeRequestData,
  CommitData,
  FileData,
  BranchWithComparison,
  PipelineData,
} from "./types";

interface GitLabMentionProps {
  reference: GitLabReference;
  channelId: string;
  jwt: string;
  children?: ReactNode;
}

export function GitLabMention({
  reference,
  channelId,
  jwt,
  children,
}: GitLabMentionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isPipelineReference = reference.type === "pipeline";
  const { data, isLoading, error } = useGitLabData({
    channelId,
    reference,
    jwt,
    enabled: isOpen && !isPipelineReference,
  });
  const {
    latest: pipeline,
    project: pipelineProject,
    isLoading: isLoadingPipeline,
    error: pipelineError,
    noPipelines,
    unauthorized: pipelineUnauthorized,
  } = useGitLabPipelines(channelId, jwt, 1, isOpen && isPipelineReference);

  const displayText = children || formatReferenceDisplay(reference);

  const getTypeColor = () => {
    switch (reference.type) {
      case "issue":
        return "text-green-600 hover:text-green-500 bg-green-500/10 hover:bg-green-500/20";
      case "mr":
        return "text-purple-600 hover:text-purple-500 bg-purple-500/10 hover:bg-purple-500/20";
      case "commit":
        return "text-orange-600 hover:text-orange-500 bg-orange-500/10 hover:bg-orange-500/20";
      case "file":
        return "text-blue-600 hover:text-blue-500 bg-blue-500/10 hover:bg-blue-500/20";
      case "branch":
        return "text-cyan-600 hover:text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20";
      case "pipeline":
        return "text-amber-600 hover:text-amber-500 bg-amber-500/10 hover:bg-amber-500/20";
      default:
        return "text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20";
    }
  };

  const renderCard = () => {
    if (isPipelineReference) {
      if (isLoadingPipeline) {
        return (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        );
      }

      if (pipelineError || !pipeline) {
        return (
          <div className="p-4 text-sm text-muted-foreground max-w-xs">
            {pipelineUnauthorized
              ? "GitLab token is invalid or expired. Please reconnect."
              : noPipelines
                ? "CI/CD is not enabled or no pipelines exist for this project."
                : "No recent pipelines found for this project."}
            <p className="text-xs mt-1 opacity-70">{reference.raw}</p>
          </div>
        );
      }

      return (
        <GitLabPipelineCard
          data={pipeline as PipelineData}
          projectPath={pipelineProject?.path || ""}
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
          ? "File not found in connected project"
          : reference.type === "branch"
            ? "Branch not found"
            : reference.type === "commit"
              ? "Commit not found"
              : "Not found in connected project";

      return (
        <div className="p-4 text-sm text-muted-foreground max-w-xs">
          <p>{notFoundMessage}</p>
          <p className="text-xs mt-1 opacity-70">{reference.raw}</p>
        </div>
      );
    }

    const projectPath = reference.group && reference.project 
      ? `${reference.group}/${reference.project}` 
      : undefined;

    switch (data.type) {
      case "issue":
        return (
          <GitLabIssueCard
            data={data.data as IssueData}
            projectPath={projectPath}
          />
        );
      case "mr":
        return (
          <GitLabMRCard
            data={data.data as MergeRequestData}
            projectPath={projectPath}
          />
        );
      case "commit":
        return (
          <GitLabCommitCard
            data={data.data as CommitData}
            projectPath={projectPath}
          />
        );
      case "file":
        return (
          <GitLabFileCard
            data={data.data as FileData}
            line={reference.line}
            projectPath={projectPath}
          />
        );
      case "branch":
        return (
          <GitLabBranchCard
            data={data.data as BranchWithComparison}
            projectPath={projectPath}
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

