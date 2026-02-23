"use client";

import useSWR from "swr";
import type { GitLabReference } from "@/lib/gitlab-parser";
import type { GitLabDataResponse, PipelineData } from "./types";

interface UseGitLabDataOptions {
  channelId: string;
  reference: GitLabReference;
  jwt: string;
  enabled?: boolean;
}

async function fetchGitLabData(
  channelId: string,
  reference: GitLabReference,
  jwt: string
): Promise<GitLabDataResponse> {
  const params = new URLSearchParams({
    channelId,
    type: reference.type,
  });

  if (reference.group) params.set("group", reference.group);
  if (reference.project) params.set("project", reference.project);
  if (reference.number) params.set("number", String(reference.number));
  if (reference.sha) params.set("sha", reference.sha);
  if (reference.path) params.set("path", reference.path);
  if (reference.branch) params.set("branch", reference.branch);

  const response = await fetch(`/api/gitlab/data?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitLab data");
  }

  return response.json();
}

export function useGitLabData({
  channelId,
  reference,
  jwt,
  enabled = true,
}: UseGitLabDataOptions) {
  const key = enabled
    ? `gitlab-data-${channelId}-${reference.type}-${reference.raw}`
    : null;

  const { data, error, isLoading } = useSWR(
    key,
    () => fetchGitLabData(channelId, reference, jwt),
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

// Hook for fetching GitLab pipelines
export function useGitLabPipelines(
  channelId: string,
  jwt: string,
  limit = 5,
  enabled = true
) {
  const key = jwt && enabled ? `gitlab-pipelines-${channelId}-${limit}` : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    async () => {
      const params = new URLSearchParams({
        channelId,
        limit: String(limit),
      });

      const response = await fetch(`/api/gitlab/pipelines?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (response.status === 401) {
        return { unauthorized: true } as const;
      }

      if (response.status === 404 || response.status === 403) {
        return { noPipelines: true } as const;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch pipelines");
      }

      return response.json() as Promise<{
        project: { path: string };
        latest: PipelineData | null;
        pipelines: PipelineData[];
        noPipelines?: boolean;
      }>;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    latest: data && "latest" in data ? data.latest : null,
    pipelines: data && "pipelines" in data ? data.pipelines : [],
    project: data && "project" in data ? data.project : null,
    noPipelines: !!(data && "noPipelines" in data && data.noPipelines),
    unauthorized: !!(data && "unauthorized" in data && data.unauthorized),
    error,
    isLoading,
    mutate,
  };
}

// Hook for checking if a channel has GitLab integration
export function useChannelGitLabIntegration(channelId: string, jwt: string) {
  const { data, error, isLoading, mutate } = useSWR(
    jwt ? `gitlab-integration-${channelId}` : null,
    async () => {
      const response = await fetch(
        `/api/gitlab/integrations?channelId=${channelId}`,
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

// Hook for fetching GitLab activity
export function useGitLabActivity(channelId: string, jwt: string) {
  const { data, error, isLoading, mutate } = useSWR(
    jwt ? `gitlab-activity-${channelId}` : null,
    async () => {
      const response = await fetch(
        `/api/gitlab/activity?channelId=${channelId}`,
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
    project: data?.project || null,
    error,
    isLoading,
    mutate,
  };
}

