import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db/db";
import { channelGithubIntegrationsTable } from "@/app/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import { GitHubClient } from "@/lib/github";

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

// GET - Get integration for a channel
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

  const integration = await db
    .select()
    .from(channelGithubIntegrationsTable)
    .where(eq(channelGithubIntegrationsTable.channel_id, channelId))
    .limit(1);

  if (integration.length === 0) {
    return NextResponse.json({ integration: null });
  }

  // Don't return the access token to the client
  const { access_token, ...safeIntegration } = integration[0];

  return NextResponse.json({ integration: safeIntegration });
}

// POST - Create a new integration
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { channelId, accessToken, repoOwner, repoName } = body;

  if (!channelId || !accessToken || !repoOwner || !repoName) {
    return NextResponse.json(
      { error: "channelId, accessToken, repoOwner, and repoName are required" },
      { status: 400 }
    );
  }

  // Verify the token works
  try {
    const client = new GitHubClient(accessToken);
    await client.getRepo(repoOwner, repoName);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid access token or repository" },
      { status: 400 }
    );
  }

  // Check if integration already exists
  const existing = await db
    .select()
    .from(channelGithubIntegrationsTable)
    .where(eq(channelGithubIntegrationsTable.channel_id, channelId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing integration
    await db
      .update(channelGithubIntegrationsTable)
      .set({
        repo_owner: repoOwner,
        repo_name: repoName,
        access_token: accessToken,
        connected_by: user.id,
      })
      .where(eq(channelGithubIntegrationsTable.channel_id, channelId));

    return NextResponse.json({
      success: true,
      integration: {
        id: existing[0].id,
        channel_id: channelId,
        repo_owner: repoOwner,
        repo_name: repoName,
        connected_by: user.id,
      },
    });
  }

  // Create new integration
  const id = nanoid();
  await db.insert(channelGithubIntegrationsTable).values({
    id,
    channel_id: channelId,
    repo_owner: repoOwner,
    repo_name: repoName,
    access_token: accessToken,
    connected_by: user.id,
    created_at: new Date(),
  });

  return NextResponse.json({
    success: true,
    integration: {
      id,
      channel_id: channelId,
      repo_owner: repoOwner,
      repo_name: repoName,
      connected_by: user.id,
    },
  });
}

// DELETE - Remove an integration
export async function DELETE(request: NextRequest) {
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

  await db
    .delete(channelGithubIntegrationsTable)
    .where(eq(channelGithubIntegrationsTable.channel_id, channelId));

  return NextResponse.json({ success: true });
}

