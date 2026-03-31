import z from "zod";
import { syncedQueryWithContext } from "@rocicorp/zero";
import { builder } from "@/app/zero/schema";
import { AuthContext } from "@/app/api/zero/get-queries/route";
import { getUserFromJwt } from "@/app/auth/jwt";

const channelAccessCondition = (userId: string) =>
  ((eb) =>
    eb.or(
      eb.cmp("is_private", false),
      eb.cmp("owner_id", userId),
      eb.exists("userAccess", (access) => access.where("user_id", userId)),
      eb.exists("groupAccess", (access) =>
        access.whereExists("group", (group) =>
          group.whereExists("members", (member) =>
            member.where("user_id", userId)
          )
        )
      )
    )) as Parameters<typeof builder.channelsTable.where>[0];

export const getChannels = syncedQueryWithContext(
  "getChannels",
  z.tuple([]),
  (ctx: AuthContext) => {
    const user = getUserFromJwt(ctx.jwt);
    return builder.channelsTable
      .where(channelAccessCondition(user.id))
      .related("owner")
      .orderBy("created_at", "desc")
      .limit(100);
  }
);

export const getChannelById = syncedQueryWithContext(
  "getChannelById",
  z.tuple([z.object({ channelId: z.string() })]),
  (ctx: AuthContext, { channelId }: { channelId: string }) => {
    const user = getUserFromJwt(ctx.jwt);
    return builder.channelsTable
      .where("id", channelId)
      .where(channelAccessCondition(user.id))
      .related("owner")
      .related("userAccess", (access) => access.related("user"))
      .related("groupAccess", (access) =>
        access.related("group", (group) => group.related("owner"))
      )
      .one();
  }
);

export const getChannelMessages = syncedQueryWithContext(
  "getChannelMessages",
  z.tuple([z.object({ channelId: z.string() })]),
  (ctx: AuthContext, { channelId }: { channelId: string }) => {
    const user = getUserFromJwt(ctx.jwt);
    return builder.messagesTable
      .where("channel_id", channelId)
      .where((eb) =>
        eb.exists("channel", (channel) =>
          channel
            .where("id", channelId)
            .where(channelAccessCondition(user.id))
        )
      )
      .related("reactions")
      .related("attachments")
      .related("webhook")
      .related("replies", (replies) =>
        replies
          .related("reactions")
          .related("attachments")
          .orderBy("created_at", "asc")
      )
      .orderBy("created_at", "asc")
      .limit(100);
  }
);

export const getThreadMessages = syncedQueryWithContext(
  "getThreadMessages",
  z.tuple([z.object({ parentId: z.string() })]),
  (ctx: AuthContext, { parentId }: { parentId: string }) => {
    const user = getUserFromJwt(ctx.jwt);
    return builder.messagesTable
      .where("parent_id", parentId)
      .where((eb) =>
        eb.exists("parent", (parent) =>
          parent.whereExists("channel", (channel) =>
            channel.where(channelAccessCondition(user.id))
          )
        )
      )
      .related("reactions")
      .related("attachments")
      .orderBy("created_at", "asc")
      .limit(100);
  }
);

export const getMessageById = syncedQueryWithContext(
  "getMessageById",
  z.tuple([z.object({ messageId: z.string() })]),
  (ctx: AuthContext, { messageId }: { messageId: string }) => {
    const user = getUserFromJwt(ctx.jwt);
    return builder.messagesTable
      .where("id", messageId)
      .where((eb) =>
        eb.exists("channel", (channel) =>
          channel.where(channelAccessCondition(user.id))
        )
      )
      .related("reactions")
      .related("attachments")
      .related("webhook")
      .one();
  }
);

export const getUserGroups = syncedQueryWithContext(
  "getUserGroups",
  z.tuple([]),
  (ctx: AuthContext) => {
    const user = getUserFromJwt(ctx.jwt);
    return builder.groupsTable
      .where((eb) =>
        eb.or(
          eb.cmp("owner_id", user.id),
          eb.exists("members", (members) =>
            members.where("user_id", user.id)
          )
        )
      )
      .related("owner")
      .related("members", (members) => members.related("user"))
      .orderBy("created_at", "desc")
      .limit(100);
  }
);

export const getAllUsers = syncedQueryWithContext(
  "getAllUsers",
  z.tuple([]),
  () => builder.usersTable.orderBy("name", "asc").limit(200)
);

export const getAllChannels = syncedQueryWithContext(
  "getAllChannels",
  z.tuple([]),
  (ctx: AuthContext) => {
    const user = getUserFromJwt(ctx.jwt);
    return builder.channelsTable
      .where(channelAccessCondition(user.id))
      .orderBy("name", "asc")
      .limit(200);
  }
);