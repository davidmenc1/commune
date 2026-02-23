import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { channelWebhooksTable, messagesTable, channelsTable } from "@/app/db/schema";
import { db } from "@/app/db/db";
import { eq } from "drizzle-orm";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const hashed = hashToken(token);

  const [webhook] = await db
    .select()
    .from(channelWebhooksTable)
    .where(eq(channelWebhooksTable.token_hash, hashed))
    .limit(1);

  if (!webhook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { content?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = body.content?.toString()?.trim();
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  // Verify the channel exists
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, webhook.channel_id))
    .limit(1);

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Insert the message directly into the database
  const messageId = nanoid();
  await db.insert(messagesTable).values({
    id: messageId,
    content,
    author_id: webhook.created_by,
    channel_id: webhook.channel_id,
    webhook_id: webhook.id, // Link to the webhook
    created_at: new Date(),
    updated: false,
  });

  // Update the webhook's last_used_at timestamp
  await db
    .update(channelWebhooksTable)
    .set({ last_used_at: new Date() })
    .where(eq(channelWebhooksTable.id, webhook.id));

  return NextResponse.json({ 
    success: true, 
    message_id: messageId 
  });
}

