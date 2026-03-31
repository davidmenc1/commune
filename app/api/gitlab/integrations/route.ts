import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db/db";
import { channelGitlabIntegrationsTable } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";
import { GitLabClient } from "@/lib/gitlab";

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
    .from(channelGitlabIntegrationsTable)
    .where(eq(channelGitlabIntegrationsTable.channel_id, channelId))
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
  const { channelId, accessToken, projectId, projectPath } = body;

  if (!channelId || !accessToken || !projectId || !projectPath) {
    return NextResponse.json(
      { error: "channelId, accessToken, projectId, and projectPath are required" },
      { status: 400 }
    );
  }

  // Verify the token works
  try {
    const client = new GitLabClient(accessToken);
    await client.getProject(projectPath);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid access token or project" },
      { status: 400 }
    );
  }

  // Check if integration already exists
  const existing = await db
    .select()
    .from(channelGitlabIntegrationsTable)
    .where(eq(channelGitlabIntegrationsTable.channel_id, channelId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing integration
    await db
      .update(channelGitlabIntegrationsTable)
      .set({
        project_id: String(projectId),
        project_path: projectPath,
        access_token: accessToken,
        connected_by: user.id,
      })
      .where(eq(channelGitlabIntegrationsTable.channel_id, channelId));

    return NextResponse.json({
      success: true,
      integration: {
        id: existing[0].id,
        channel_id: channelId,
        project_id: projectId,
        project_path: projectPath,
        connected_by: user.id,
      },
    });
  }

  // Create new integration
  const id = nanoid();
  await db.insert(channelGitlabIntegrationsTable).values({
    id,
    channel_id: channelId,
    project_id: String(projectId),
    project_path: projectPath,
    access_token: accessToken,
    connected_by: user.id,
    created_at: new Date(),
  });

  return NextResponse.json({
    success: true,
    integration: {
      id,
      channel_id: channelId,
      project_id: projectId,
      project_path: projectPath,
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
    .delete(channelGitlabIntegrationsTable)
    .where(eq(channelGitlabIntegrationsTable.channel_id, channelId));

  return NextResponse.json({ success: true });
}

