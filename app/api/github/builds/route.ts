import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import {
  getGitHubClientForChannel,
  getChannelGitHubIntegration,
} from "@/lib/github";

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
  const parsedLimit = parseInt(searchParams.get("limit") || "5", 10);
  const limit = Number.isNaN(parsedLimit)
    ? 5
    : Math.min(Math.max(parsedLimit, 1), 20);

  if (!channelId) {
    return NextResponse.json(
      { error: "channelId is required" },
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

  const repoOwner = integration.repo_owner;
  const repoName = integration.repo_name;

  try {
    const runs = await client.getWorkflowRuns(repoOwner, repoName, limit);
    const latest = runs[0] || null;

    // If no runs, treat as "no builds configured" but return 200
    if (!latest) {
      return NextResponse.json({
        repo: {
          owner: repoOwner,
          name: repoName,
        },
        latest: null,
        runs: [],
        noBuilds: true,
      });
    }

    return NextResponse.json({
      repo: {
        owner: repoOwner,
        name: repoName,
      },
      latest,
      runs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const statusMatch = message.match(/GitHub API error:\s*(\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;

    // Token invalid/expired
    if (message.includes("Bad credentials")) {
      return NextResponse.json(
        { error: "GitHub token invalid or expired. Reconnect the integration.", unauthorized: true },
        { status: 401 }
      );
    }

    // No workflows / Actions disabled / repo not found / insufficient permissions to Actions
    if (
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404
    ) {
      return NextResponse.json(
        {
          error:
            "No workflow runs found. GitHub Actions may be disabled, missing permissions, or no workflows exist for this repo.",
          noBuilds: true,
        },
        { status: 200 }
      );
    }

    console.error("Failed to fetch workflow runs:", err);
    return NextResponse.json(
      { error: "Failed to fetch workflow runs" },
      { status: 500 }
    );
  }
}


