"use client";

import useSWR from "swr";
import type { GitHubReference } from "@/lib/github-parser";
import type { GitHubDataResponse, WorkflowRunData } from "./types";

interface UseGitHubDataOptions {
  channelId: string;
  reference: GitHubReference;
  jwt: string;
  enabled?: boolean;
}

async function fetchGitHubData(
  channelId: string,
  reference: GitHubReference,
  jwt: string
): Promise<GitHubDataResponse> {
  const params = new URLSearchParams({
    channelId,
    type: reference.type,
  });

  if (reference.owner) params.set("owner", reference.owner);
  if (reference.repo) params.set("repo", reference.repo);
  if (reference.number) params.set("number", String(reference.number));
  if (reference.sha) params.set("sha", reference.sha);
  if (reference.path) params.set("path", reference.path);
  if (reference.branch) params.set("branch", reference.branch);

  const response = await fetch(`/api/github/data?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub data");
  }

  return response.json();
}

export function useGitHubData({
  channelId,
  reference,
  jwt,
  enabled = true,
}: UseGitHubDataOptions) {
  const key = enabled
    ? `github-data-${channelId}-${reference.type}-${reference.raw}`
    : null;

  const { data, error, isLoading } = useSWR(
    key,
    () => fetchGitHubData(channelId, reference, jwt),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    data,
    error,
    isLoading,
  };
}

// Hook for fetching GitHub workflow runs (builds)
export function useGitHubBuilds(
  channelId: string,
  jwt: string,
  limit = 5,
  enabled = true
) {
  const key = jwt && enabled ? `github-builds-${channelId}-${limit}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      const params = new URLSearchParams({
        channelId,
        limit: String(limit),
      });

      const response = await fetch(`/api/github/builds?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (response.status === 401) {
        return { unauthorized: true } as const;
      }

      if (response.status === 404 || response.status === 403) {
        return { noBuilds: true } as const;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch builds");
      }

      return response.json() as Promise<{
        repo: { owner: string; name: string };
        latest: WorkflowRunData | null;
        runs: WorkflowRunData[];
        noBuilds?: boolean;
      }>;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    latest: data && "latest" in data ? data.latest : null,
    runs: data && "runs" in data ? data.runs : [],
    repo: data && "repo" in data ? data.repo : null,
    noBuilds: !!(data && "noBuilds" in data && data.noBuilds),
    unauthorized: !!(data && "unauthorized" in data && data.unauthorized),
    error,
    isLoading,
    mutate,
  };
}

// Hook for checking if a channel has GitHub integration
export function useChannelGitHubIntegration(channelId: string, jwt: string) {
  const { data, error, isLoading, mutate } = useSWR(
    jwt ? `github-integration-${channelId}` : null,
    async () => {
      const response = await fetch(
        `/api/github/integrations?channelId=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch integration");
      return response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    integration: data?.integration || null,
    error,
    isLoading,
    mutate,
  };
}

// Hook for fetching GitHub activity
export function useGitHubActivity(channelId: string, jwt: string) {
  const { data, error, isLoading, mutate } = useSWR(
    jwt ? `github-activity-${channelId}` : null,
    async () => {
      const response = await fetch(
        `/api/github/activity?channelId=${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch activity");
      }
      return response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    activity: data?.activity || null,
    repo: data?.repo || null,
    error,
    isLoading,
    mutate,
  };
}

