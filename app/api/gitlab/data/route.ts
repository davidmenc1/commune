import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import {
  getGitLabClientForChannel,
  getChannelGitLabIntegration,
} from "@/lib/gitlab";
import type { GitLabReferenceType } from "@/lib/gitlab-parser";

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
  const type = searchParams.get("type") as GitLabReferenceType;
  const group = searchParams.get("group");
  const project = searchParams.get("project");
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

  // Get the GitLab client for this channel
  const client = await getGitLabClientForChannel(channelId);
  if (!client) {
    return NextResponse.json(
      { error: "No GitLab integration for this channel" },
      { status: 404 }
    );
  }

  // Get the integration to know the default project
  const integration = await getChannelGitLabIntegration(channelId);
  if (!integration) {
    return NextResponse.json(
      { error: "No GitLab integration for this channel" },
      { status: 404 }
    );
  }

  // Use explicit group/project or fall back to the channel's connected project
  const projectPath = group && project 
    ? `${group}/${project}` 
    : integration.project_path;

  try {
    switch (type) {
      case "issue": {
        if (!number) {
          return NextResponse.json(
            { error: "number is required for issues" },
            { status: 400 }
          );
        }
        const issue = await client.getIssue(projectPath, parseInt(number, 10));
        return NextResponse.json({ type: "issue", data: issue });
      }

      case "mr": {
        if (!number) {
          return NextResponse.json(
            { error: "number is required for MRs" },
            { status: 400 }
          );
        }
        const mr = await client.getMergeRequest(projectPath, parseInt(number, 10));
        // Get changes count
        try {
          const changes = await client.getMergeRequestChanges(projectPath, parseInt(number, 10));
          return NextResponse.json({ 
            type: "mr", 
            data: { ...mr, changes_count: changes.changes_count } 
          });
        } catch {
          return NextResponse.json({ type: "mr", data: mr });
        }
      }

      case "commit": {
        if (!sha) {
          return NextResponse.json(
            { error: "sha is required for commits" },
            { status: 400 }
          );
        }
        const commit = await client.getCommit(projectPath, sha);
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
          projectPath,
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
        const branchData = await client.getBranch(projectPath, branch);
        // Also get comparison with default branch
        const projectData = await client.getProject(projectPath);
        let comparison = null;
        if (branch !== projectData.default_branch) {
          try {
            comparison = await client.compareBranches(
              projectPath,
              projectData.default_branch,
              branch
            );
          } catch {
            // Comparison might fail if branches have diverged too much
          }
        }
        return NextResponse.json({
          type: "branch",
          data: { branch: branchData, comparison, defaultBranch: projectData.default_branch },
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
    
    // Check if it's a 404 (not found) error from GitLab
    if (errorMessage.includes("404")) {
      return NextResponse.json(
        { error: "Not found", notFound: true },
        { status: 404 }
      );
    }
    
    console.error("GitLab API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch GitLab data" },
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

  const client = await getGitLabClientForChannel(channelId);
  if (!client) {
    return NextResponse.json(
      { error: "No GitLab integration for this channel" },
      { status: 404 }
    );
  }

  const integration = await getChannelGitLabIntegration(channelId);
  if (!integration) {
    return NextResponse.json(
      { error: "No GitLab integration for this channel" },
      { status: 404 }
    );
  }

  const results: Record<string, unknown> = {};

  // Process references in parallel (with a limit)
  const promises = references.slice(0, 10).map(async (ref: {
    type: GitLabReferenceType;
    key: string;
    group?: string;
    project?: string;
    number?: number;
    sha?: string;
    path?: string;
    branch?: string;
  }) => {
    const projectPath = ref.group && ref.project 
      ? `${ref.group}/${ref.project}` 
      : integration.project_path;

    try {
      switch (ref.type) {
        case "issue": {
          if (!ref.number) {
            results[ref.key] = { error: true };
            return;
          }
          const issue = await client.getIssue(projectPath, ref.number);
          results[ref.key] = { type: "issue", data: issue };
          break;
        }
        case "mr": {
          if (!ref.number) {
            results[ref.key] = { error: true };
            return;
          }
          const mr = await client.getMergeRequest(projectPath, ref.number);
          results[ref.key] = { type: "mr", data: mr };
          break;
        }
        case "commit": {
          if (!ref.sha) {
            results[ref.key] = { error: true };
            return;
          }
          const commit = await client.getCommit(projectPath, ref.sha);
          results[ref.key] = { type: "commit", data: commit };
          break;
        }
        case "file": {
          if (!ref.path) {
            results[ref.key] = { error: true };
            return;
          }
          const file = await client.getFileContent(projectPath, ref.path);
          results[ref.key] = { type: "file", data: file };
          break;
        }
        case "branch": {
          if (!ref.branch) {
            results[ref.key] = { error: true };
            return;
          }
          const branchData = await client.getBranch(projectPath, ref.branch);
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

