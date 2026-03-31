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

  const channelId = request.nextUrl.searchParams.get("channelId");
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

  try {
    // Fetch recent activity in parallel
    const [commits, pullRequests, issues] = await Promise.all([
      client.getRecentCommits(integration.repo_owner, integration.repo_name, 5),
      client.getOpenPullRequests(
        integration.repo_owner,
        integration.repo_name,
        5
      ),
      client.getOpenIssues(integration.repo_owner, integration.repo_name, 5),
    ]);

    return NextResponse.json({
      repo: {
        owner: integration.repo_owner,
        name: integration.repo_name,
      },
      activity: {
        commits: commits.map((c) => ({
          sha: c.sha,
          shortSha: c.sha.slice(0, 7),
          message: c.commit.message.split("\n")[0],
          author: c.author?.login || c.commit.author.name,
          authorAvatar: c.author?.avatar_url,
          date: c.commit.author.date,
          url: c.html_url,
        })),
        pullRequests: pullRequests.map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft,
          author: pr.user.login,
          authorAvatar: pr.user.avatar_url,
          createdAt: pr.created_at,
          url: pr.html_url,
          labels: pr.labels.map((l) => ({ name: l.name, color: l.color })),
        })),
        issues: issues
          .filter((i) => !i.pull_request) // Filter out PRs from issues list
          .map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            author: issue.user.login,
            authorAvatar: issue.user.avatar_url,
            createdAt: issue.created_at,
            url: issue.html_url,
            labels: issue.labels.map((l) => ({ name: l.name, color: l.color })),
          })),
      },
    });
  } catch (err) {
    console.error("Failed to fetch GitHub activity:", err);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

