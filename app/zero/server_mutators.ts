import { CustomMutatorDefs, Transaction } from "@rocicorp/zero";
import { Schema } from "./schema";
import { db } from "../db/db";
import { usersTable } from "../db/schema";
import { count, eq } from "drizzle-orm";
import { decodeJwt } from "jose";
import { jwtSchema } from "../auth/jwt";
import { nanoid } from "nanoid";
import { parseMentions, hasMentions } from "@/lib/mention-parser";

type ServerAuthData = {
  jwt?: string;
  actingUserId?: string;
};

export function createServerMutators(
  authData: ServerAuthData,
  clientMutators: CustomMutatorDefs
) {
  const authJwt = authData.jwt;

  return {
    ...clientMutators,

    user: {
      insert: async (
        tx: Transaction<Schema>,
        { setupCode }: { setupCode: string }
      ) => {
        if (!authJwt) {
          throw new Error("JWT required");
        }

        const payload = decodeJwt(authJwt);

        const { name, email, id } = jwtSchema.parse(payload);

        const isSetup = await db.select({ count: count() }).from(usersTable);
        const isAnyoneAdmin = await db
          .select({ count: count() })
          .from(usersTable)
          .where(eq(usersTable.role, "admin"));

        const role =
          isSetup[0].count === 0 &&
          setupCode === process.env.SETUP_CODE &&
          isAnyoneAdmin[0].count === 0
            ? "admin"
            : "user";

        await tx.mutate.usersTable.insert({
          id,
          name,
          email,
          image: "",
          created_at: Date.now(),
          role,
        });
      },
    },
    webhooks: {
      post: async (
        tx: Transaction<Schema>,
        {
          channelId,
          content,
          authorId,
        }: { channelId: string; content: string; authorId?: string }
      ) => {
        const trimmed = content?.trim();
        if (!trimmed) {
          throw new Error("Content is required");
        }

        const channel = await tx.query.channelsTable
          .where("id", channelId)
          .one();
        if (!channel) {
          throw new Error("Channel not found");
        }

        let resolvedAuthorId = authorId ?? authData.actingUserId ?? null;
        if (!resolvedAuthorId && authJwt) {
          resolvedAuthorId = jwtSchema.parse(decodeJwt(authJwt)).id;
        }

        if (!resolvedAuthorId) {
          throw new Error("Author is required");
        }

        const messageId = nanoid();
        await tx.mutate.messagesTable.insert({
          id: messageId,
          content: trimmed,
          author_id: resolvedAuthorId,
          channel_id: channelId,
          created_at: Date.now(),
        });

        // Create notifications for mentions in webhook messages
        if (hasMentions(trimmed)) {
          const mentions = parseMentions(trimmed);
          const users = await tx.query.usersTable.run();
          
          for (const mention of mentions) {
            if (mention.type === "user") {
              const searchName = mention.name.toLowerCase();
              const mentionedUser = users.find(
                (u) =>
                  u.name.toLowerCase() === searchName ||
                  u.email.toLowerCase().split("@")[0] === searchName ||
                  u.name.toLowerCase().replace(/\s+/g, ".") === searchName ||
                  u.name.toLowerCase().replace(/\s+/g, "_") === searchName ||
                  u.name.toLowerCase().replace(/\s+/g, "-") === searchName
              );

              if (mentionedUser && mentionedUser.id !== resolvedAuthorId) {
                await tx.mutate.notificationsTable.insert({
                  id: nanoid(),
                  user_id: mentionedUser.id,
                  message_id: messageId,
                  channel_id: channelId,
                  mention_type: "user",
                  is_read: false,
                  created_at: Date.now(),
                });
              }
            }
          }
        }
      },
    },
  };
}
