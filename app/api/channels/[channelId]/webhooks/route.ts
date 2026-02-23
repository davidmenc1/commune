import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db/db";
import {
  channelWebhooksTable,
  channelsTable,
  usersTable,
} from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createHash, randomBytes } from "crypto";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";

function getBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

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

async function ensureCanManageChannel(userId: string, channelId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const canManage =
    channel.owner_id === userId ||
    user.role === "admin" ||
    user.role === "owner";

  if (!canManage) {
    throw new Error("Forbidden");
  }

  return channel;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureCanManageChannel(user.id, channelId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forbidden";
    const status = message === "Forbidden" ? 403 : 404;
    return NextResponse.json({ error: message }, { status });
  }

  const webhooks = await db
    .select({
      id: channelWebhooksTable.id,
      name: channelWebhooksTable.name,
      created_at: channelWebhooksTable.created_at,
      last_used_at: channelWebhooksTable.last_used_at,
    })
    .from(channelWebhooksTable)
    .where(eq(channelWebhooksTable.channel_id, channelId));

  return NextResponse.json({ webhooks });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string } = {};
  try {
    body = await request.json();
  } catch {
    // ignore malformed body and fall back to defaults
  }

  const name = body.name?.trim() || "Webhook";

  try {
    await ensureCanManageChannel(user.id, channelId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forbidden";
    const status = message === "Forbidden" ? 403 : 404;
    return NextResponse.json({ error: message }, { status });
  }

  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const webhookId = nanoid();

  const now = new Date();

  await db.insert(channelWebhooksTable).values({
    id: webhookId,
    channel_id: channelId,
    name,
    token_hash: tokenHash,
    created_by: user.id,
    created_at: now,
  });

  const base = getBaseUrl();
  const baseUrl = base.endsWith("/") ? base.slice(0, -1) : base;
  const url = `${baseUrl}/api/webhooks/${token}`;

  return NextResponse.json({
    webhook: {
      id: webhookId,
      name,
      created_at: now,
      last_used_at: null,
    },
    token,
    url,
  });
}
