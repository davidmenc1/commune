import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/db/db";
import {
  channelWebhooksTable,
  channelsTable,
  usersTable,
} from "@/app/db/schema";
import { and, eq } from "drizzle-orm";
import { decodeJwt } from "jose";
import { jwtSchema } from "@/app/auth/jwt";

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; webhookId: string }> }
) {
  const { channelId, webhookId } = await params;
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

  await db
    .delete(channelWebhooksTable)
    .where(
      and(
        eq(channelWebhooksTable.channel_id, channelId),
        eq(channelWebhooksTable.id, webhookId)
      )
    );

  return NextResponse.json({ success: true });
}

