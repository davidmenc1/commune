import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import {
  getGitHubClientForChannel,
  getChannelGitHubIntegration,
} from "@/lib/github";
import type { GitHubReferenceType } from "@/lib/github-parser";

function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const jwt = authHeader.replace("Bearer ", "");
  try {
    const payload = decodeJwt(jwt);
    return jwtSchema.parse(payload);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const channelId = searchParams.get("channelId");
  const type = searchParams.get("type") as GitHubReferenceType;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const number = searchParams.get("number");
  const sha = searchParams.get("sha");
  const path = searchParams.get("path");
  const branch = searchParams.get("branch");
  const ref = searchParams.get("ref");

  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
      { status: 400 }
    );
  }

  // Get the GitHub client for this channel
  const client = await getGitHubClientForChannel(channelId);
  if (!client) {
    return NextResponse.json(
      { error: "No GitHub integration for this channel" },
      { status: 404 }
    );
  }

  // Get the integration to know the default repo
  const integration = await getChannelGitHubIntegration(channelId);
  if (!integration) {
    return NextResponse.json(
      { error: "No GitHub integration for this channel" },
      { status: 404 }
    );
  }

  // Use explicit owner/repo or fall back to the channel's connected repo
  const repoOwner = owner || integration.repo_owner;
  const repoName = repo || integration.repo_name;

  try {
    switch (type) {
      case "issue": {
        if (!number) {
          return NextResponse.json(
            { error: "number is required for issues" },
            { status: 400 }
          );
        }
        const issue = await client.getIssue(
          repoOwner,
          repoName,
          parseInt(number, 10)
        );
        // Check if it's actually a PR
        if (issue.pull_request) {
          const pr = await client.getPullRequest(
            repoOwner,
            repoName,
            parseInt(number, 10)
          );
          return NextResponse.json({ type: "pr", data: pr });
        }
        return NextResponse.json({ type: "issue", data: issue });
      }

      case "pr": {
        if (!number) {
          return NextResponse.json(
            { error: "number is required for PRs" },
            { status: 400 }
          );
        }
        const pr = await client.getPullRequest(
          repoOwner,
          repoName,
          parseInt(number, 10)
        );
        return NextResponse.json({ type: "pr", data: pr });
      }

      case "commit": {
        if (!sha) {
          return NextResponse.json(
            { error: "sha is required for commits" },
            { status: 400 }
          );
        }
        const commit = await client.getCommit(repoOwner, repoName, sha);
        return NextResponse.json({ type: "commit", data: commit });
      }

      case "file": {
        if (!path) {
          return NextResponse.json(
            { error: "path is required for files" },
            { status: 400 }
          );
        }
        const file = await client.getFileContent(
          repoOwner,
          repoName,
          path,
          ref || undefined
        );
        return NextResponse.json({ type: "file", data: file });
      }

      case "branch": {
        if (!branch) {
          return NextResponse.json(
            { error: "branch is required" },
            { status: 400 }
          );
        }
        const branchData = await client.getBranch(repoOwner, repoName, branch);
        // Also get comparison with default branch
        const repoData = await client.getRepo(repoOwner, repoName);
        let comparison = null;
        if (branch !== repoData.default_branch) {
          try {
            comparison = await client.compareBranches(
              repoOwner,
              repoName,
              repoData.default_branch,
              branch
            );
          } catch {
            // Comparison might fail if branches have diverged too much
          }
        }
        return NextResponse.json({
          type: "branch",
          data: { branch: branchData, comparison, defaultBranch: repoData.default_branch },
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid reference type" },
          { status: 400 }
        );
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    
    // Check if it's a 404 (not found) error from GitHub
    if (errorMessage.includes("404")) {
      return NextResponse.json(
        { error: "Not found", notFound: true },
        { status: 404 }
      );
    }
    
    console.error("GitHub API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch GitHub data" },
      { status: 500 }
    );
  }
}

// Batch endpoint to fetch multiple references at once
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channelId, references } = body;

  if (!channelId || !references || !Array.isArray(references)) {
    return NextResponse.json(
      { error: "channelId and references array are required" },
      { status: 400 }
    );
  }

  const client = await getGitHubClientForChannel(channelId);
  if (!client) {
    return NextResponse.json(
      { error: "No GitHub integration for this channel" },
      { status: 404 }
    );
  }

  const integration = await getChannelGitHubIntegration(channelId);
  if (!integration) {
    return NextResponse.json(
      { error: "No GitHub integration for this channel" },
      { status: 404 }
    );
  }

  const results: Record<string, unknown> = {};

  // Process references in parallel (with a limit)
  const promises = references.slice(0, 10).map(async (ref: {
    type: GitHubReferenceType;
    key: string;
    owner?: string;
    repo?: string;
    number?: number;
    sha?: string;
    path?: string;
    branch?: string;
  }) => {
    const repoOwner = ref.owner || integration.repo_owner;
    const repoName = ref.repo || integration.repo_name;

    try {
      switch (ref.type) {
        case "issue": {
          if (!ref.number) {
            results[ref.key] = { error: true };
            return;
          }
          const issue = await client.getIssue(repoOwner, repoName, ref.number);
          if (issue.pull_request) {
            const pr = await client.getPullRequest(
              repoOwner,
              repoName,
              ref.number
            );
            results[ref.key] = { type: "pr", data: pr };
          } else {
            results[ref.key] = { type: "issue", data: issue };
          }
          break;
        }
        case "pr": {
          if (!ref.number) {
            results[ref.key] = { error: true };
            return;
          }
          const pr = await client.getPullRequest(
            repoOwner,
            repoName,
            ref.number
          );
          results[ref.key] = { type: "pr", data: pr };
          break;
        }
        case "commit": {
          if (!ref.sha) {
            results[ref.key] = { error: true };
            return;
          }
          const commit = await client.getCommit(repoOwner, repoName, ref.sha);
          results[ref.key] = { type: "commit", data: commit };
          break;
        }
        case "file": {
          if (!ref.path) {
            results[ref.key] = { error: true };
            return;
          }
          const file = await client.getFileContent(
            repoOwner,
            repoName,
            ref.path
          );
          results[ref.key] = { type: "file", data: file };
          break;
        }
        case "branch": {
          if (!ref.branch) {
            results[ref.key] = { error: true };
            return;
          }
          const branchData = await client.getBranch(
            repoOwner,
            repoName,
            ref.branch
          );
          results[ref.key] = { type: "branch", data: { branch: branchData } };
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${ref.type} ${ref.key}:`, err);
      results[ref.key] = { error: true };
    }
  });

  await Promise.all(promises);

  return NextResponse.json({ results });
}

