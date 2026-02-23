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

  const channelId = request.nextUrl.searchParams.get("channelId");
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

  try {
    // Fetch recent activity in parallel
    const [commits, mergeRequests, issues] = await Promise.all([
      client.getRecentCommits(integration.project_path, 5),
      client.getOpenMergeRequests(integration.project_path, 5),
      client.getOpenIssues(integration.project_path, 5),
    ]);

    return NextResponse.json({
      project: {
        path: integration.project_path,
      },
      activity: {
        commits: commits.map((c) => ({
          sha: c.id,
          shortSha: c.short_id,
          message: c.title,
          author: c.author_name,
          date: c.authored_date,
          url: c.web_url,
        })),
        mergeRequests: mergeRequests.map((mr) => ({
          iid: mr.iid,
          title: mr.title,
          state: mr.state,
          draft: mr.draft,
          author: mr.author.username,
          authorAvatar: mr.author.avatar_url,
          createdAt: mr.created_at,
          url: mr.web_url,
          labels: mr.labels,
        })),
        issues: issues.map((issue) => ({
          iid: issue.iid,
          title: issue.title,
          state: issue.state,
          author: issue.author.username,
          authorAvatar: issue.author.avatar_url,
          createdAt: issue.created_at,
          url: issue.web_url,
          labels: issue.labels,
        })),
      },
    });
  } catch (err) {
    console.error("Failed to fetch GitLab activity:", err);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

