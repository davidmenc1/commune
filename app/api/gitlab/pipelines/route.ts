import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import {
  getGitLabClientForChannel,
  getChannelGitLabIntegration,
} from "@/lib/gitlab";

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

  const projectPath = integration.project_path;

  try {
    const pipelines = await client.getPipelines(projectPath, limit);
    const latest = pipelines[0] || null;

    // If no pipelines, treat as "no pipelines configured" but return 200
    if (!latest) {
      return NextResponse.json({
        project: {
          path: projectPath,
        },
        latest: null,
        pipelines: [],
        noPipelines: true,
      });
    }

    return NextResponse.json({
      project: {
        path: projectPath,
      },
      latest,
      pipelines,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const statusMatch = message.match(/GitLab API error:\s*(\d+)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;

    // Token invalid/expired
    if (message.includes("401") || message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "GitLab token invalid or expired. Reconnect the integration.", unauthorized: true },
        { status: 401 }
      );
    }

    // No pipelines / CI disabled / project not found / insufficient permissions
    if (
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404
    ) {
      return NextResponse.json(
        {
          error:
            "No pipelines found. CI/CD may be disabled, missing permissions, or no pipelines exist for this project.",
          noPipelines: true,
        },
        { status: 200 }
      );
    }

    console.error("Failed to fetch pipelines:", err);
    return NextResponse.json(
      { error: "Failed to fetch pipelines" },
      { status: 500 }
    );
  }
}

