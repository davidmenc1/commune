import { CustomMutatorDefs, Transaction } from "@rocicorp/zero";
import { Schema } from "@/app/zero/schema";
import { jwtSchema } from "../auth/jwt";
import { decodeJwt } from "jose";
import { nanoid } from "nanoid";
import { parseMentions, hasMentions } from "@/lib/mention-parser";

type AuthUser = ReturnType<typeof jwtSchema.parse>;

type ChannelAccessInput = {
  userIds?: string[];
  groupIds?: string[];
};

type ChannelMemberRole = "admin" | "guest" | "member";

type AttachmentInput = {
  id: string;
  filename: string;
  file_type: string;
  file_size: string;
  storage_path: string;
};

const DEFAULT_CHANNEL_ROLE = "member" as const;

async function ensureAdminOrOwner(
  tx: Transaction<Schema>,
  userId: string
) {
  const user = await tx.query.usersTable.where("id", userId).one();
  if (!user) {
    throw new Error("User not found");
  }
  if (user.role !== "admin" && user.role !== "owner") {
    throw new Error("Only admins or owners can perform this action");
  }
}

async function ensureChannelWriteAccess(
  tx: Transaction<Schema>,
  channelId: string,
  userId: string
) {
  const channel = await tx.query.channelsTable.where("id", channelId).one();

  if (!channel) {
    throw new Error("Channel not found");
  }

  if (!channel.is_private) {
    return;
  }

  if (channel.owner_id === userId) {
    return;
  }

  const directAccess = await tx.query.channelUserAccess
    .where("channel_id", channelId)
    .where("user_id", userId)
    .one();

  if (directAccess?.can_write) {
    return;
  }

  const memberships = await tx.query.groupMembers
    .where("user_id", userId)
    .run();

  for (const membership of memberships) {
    const groupAccess = await tx.query.channelGroupAccess
      .where("channel_id", channelId)
      .where("group_id", membership.group_id)
      .where("can_write", true)
      .one();

    if (groupAccess) {
      return;
    }
  }

  throw new Error("Not authorized to write to this channel");
}

async function ensureChannelOwner(
  tx: Transaction<Schema>,
  channelId: string,
  userId: string
) {
  const channel = await tx.query.channelsTable.where("id", channelId).one();

  if (!channel) {
    throw new Error("Channel not found");
  }

  if (channel.owner_id !== userId) {
    throw new Error("Only the channel owner can perform this action");
  }
}

async function ensureChannelOwnerOrPrivileged(
  tx: Transaction<Schema>,
  channelId: string,
  userId: string
) {
  const channel = await tx.query.channelsTable.where("id", channelId).one();
  if (!channel) {
    throw new Error("Channel not found");
  }
  if (channel.owner_id === userId) {
    return channel;
  }
  await ensureAdminOrOwner(tx, userId);
  return channel;
}

async function addChannelMemberIfMissing(
  tx: Transaction<Schema>,
  channelId: string,
  userId: string,
  role: ChannelMemberRole = DEFAULT_CHANNEL_ROLE
) {
  const existing = await tx.query.channelMembers
    .where("channelId", channelId)
    .where("userId", userId)
    .one();

  if (!existing) {
    await tx.mutate.channelMembers.insert({
      channelId,
      userId,
      role,
    });
  }
}

async function removeChannelMembershipIfNoAccess(
  tx: Transaction<Schema>,
  channelId: string,
  userId: string
) {
  const channel = await tx.query.channelsTable.where("id", channelId).one();
  if (!channel) {
    return;
  }

  if (channel.owner_id === userId) {
    return;
  }

  const directAccess = await tx.query.channelUserAccess
    .where("channel_id", channelId)
    .where("user_id", userId)
    .one();

  if (directAccess) {
    return;
  }

  const groupAccess = await tx.query.channelGroupAccess
    .where("channel_id", channelId)
    .run();

  for (const access of groupAccess) {
    const membership = await tx.query.groupMembers
      .where("group_id", access.group_id)
      .where("user_id", userId)
      .one();
    if (membership) {
      return;
    }
  }

  await tx.mutate.channelMembers.delete({ channelId, userId });
}

async function syncPrivateChannelAccess(
  tx: Transaction<Schema>,
  channelId: string,
  ownerId: string,
  access: ChannelAccessInput
) {
  const { userIds = [], groupIds = [] } = access;
  const desiredUserIds = new Set([ownerId, ...userIds.filter(Boolean)]);

  const existingUserAccess = await tx.query.channelUserAccess
    .where("channel_id", channelId)
    .run();

  for (const entry of existingUserAccess) {
    if (entry.user_id === ownerId) {
      desiredUserIds.delete(entry.user_id);
      continue;
    }

    if (!desiredUserIds.has(entry.user_id)) {
      await tx.mutate.channelUserAccess.delete({
        channel_id: channelId,
        user_id: entry.user_id,
      });
      await removeChannelMembershipIfNoAccess(tx, channelId, entry.user_id);
    } else {
      desiredUserIds.delete(entry.user_id);
    }
  }

  for (const userId of desiredUserIds) {
    await tx.mutate.channelUserAccess.insert({
      channel_id: channelId,
      user_id: userId,
      can_write: true,
    });

    await addChannelMemberIfMissing(
      tx,
      channelId,
      userId,
      userId === ownerId ? "admin" : DEFAULT_CHANNEL_ROLE
    );
  }

  const desiredGroupIds = new Set(groupIds.filter(Boolean));
  const existingGroupAccess = await tx.query.channelGroupAccess
    .where("channel_id", channelId)
    .run();

  for (const entry of existingGroupAccess) {
    if (!desiredGroupIds.has(entry.group_id)) {
      await tx.mutate.channelGroupAccess.delete({
        channel_id: channelId,
        group_id: entry.group_id,
      });

      const members = await tx.query.groupMembers
        .where("group_id", entry.group_id)
        .run();

      for (const member of members) {
        await removeChannelMembershipIfNoAccess(
          tx,
          channelId,
          member.user_id
        );
      }
    } else {
      desiredGroupIds.delete(entry.group_id);
    }
  }

  for (const groupId of desiredGroupIds) {
    await tx.mutate.channelGroupAccess.insert({
      channel_id: channelId,
      group_id: groupId,
      can_write: true,
    });

    const members = await tx.query.groupMembers
      .where("group_id", groupId)
      .run();

    for (const member of members) {
      await addChannelMemberIfMissing(tx, channelId, member.user_id);
    }
  }
}

async function clearChannelPrivacyAccess(
  tx: Transaction<Schema>,
  channelId: string,
  ownerId: string
) {
  const userAccess = await tx.query.channelUserAccess
    .where("channel_id", channelId)
    .run();

  for (const entry of userAccess) {
    if (entry.user_id === ownerId) {
      continue;
    }
    await tx.mutate.channelUserAccess.delete({
      channel_id: channelId,
      user_id: entry.user_id,
    });
    await removeChannelMembershipIfNoAccess(tx, channelId, entry.user_id);
  }

  const groupAccess = await tx.query.channelGroupAccess
    .where("channel_id", channelId)
    .run();

  for (const entry of groupAccess) {
    await tx.mutate.channelGroupAccess.delete({
      channel_id: channelId,
      group_id: entry.group_id,
    });

    const members = await tx.query.groupMembers
      .where("group_id", entry.group_id)
      .run();

    for (const member of members) {
      await removeChannelMembershipIfNoAccess(tx, channelId, member.user_id);
    }
  }
}

async function grantChannelAccess(
  tx: Transaction<Schema>,
  channelId: string,
  input: ChannelAccessInput
) {
  const { userIds = [], groupIds = [] } = input;

  const dedupedUserIds = Array.from(new Set(userIds));
  const dedupedGroupIds = Array.from(new Set(groupIds));

  for (const userId of dedupedUserIds) {
    const hasAccess = await tx.query.channelUserAccess
      .where("channel_id", channelId)
      .where("user_id", userId)
      .one();

    if (!hasAccess) {
      await tx.mutate.channelUserAccess.insert({
        channel_id: channelId,
        user_id: userId,
        can_write: true,
      });
    }

    await addChannelMemberIfMissing(tx, channelId, userId);
  }

  for (const groupId of dedupedGroupIds) {
    const hasGroup = await tx.query.channelGroupAccess
      .where("channel_id", channelId)
      .where("group_id", groupId)
      .one();

    if (!hasGroup) {
      await tx.mutate.channelGroupAccess.insert({
        channel_id: channelId,
        group_id: groupId,
        can_write: true,
      });

      const members = await tx.query.groupMembers
        .where("group_id", groupId)
        .run();

      for (const member of members) {
        await addChannelMemberIfMissing(tx, channelId, member.user_id);
      }
    }
  }
}

function getAuthUser(authData: { jwt: string }): AuthUser {
  const payload = decodeJwt(authData.jwt);
  return jwtSchema.parse(payload);
}

export function createMutators(authData: { jwt: string }) {
  const authUser = getAuthUser(authData);

  return {
    messages: {
      insert: async (
        tx: Transaction<Schema>,
        {
          content,
          channelId,
          attachments,
          parentId,
        }: {
          content: string;
          channelId: string;
          attachments?: AttachmentInput[];
          parentId?: string;
        }
      ) => {
        // If replying to a message, inherit channel_id from parent if not provided
        let actualChannelId = channelId;
        if (parentId) {
          const parentMessage = await tx.query.messagesTable
            .where("id", parentId)
            .one();
          
          if (!parentMessage) {
            throw new Error("Parent message not found");
          }
          
          // Use parent's channel_id
          actualChannelId = parentMessage.channel_id || channelId;
          
          // Prevent nested threading - parent must be top-level
          if (parentMessage.parent_id) {
            throw new Error("Cannot reply to a reply. Please reply to the parent message.");
          }
        }

        await ensureChannelWriteAccess(tx, actualChannelId, authUser.id);

        const messageId = nanoid();
        await tx.mutate.messagesTable.insert({
          id: messageId,
          content,
          author_id: authUser.id,
          channel_id: actualChannelId,
          parent_id: parentId || null,
          created_at: Date.now(),
        });

        // Insert attachment records
        if (attachments && attachments.length > 0) {
          for (const att of attachments) {
            await tx.mutate.attachmentsTable.insert({
              id: att.id,
              message_id: messageId,
              filename: att.filename,
              file_type: att.file_type,
              file_size: att.file_size,
              storage_path: att.storage_path,
              created_at: Date.now(),
            });
          }
        }

        // Create notifications for mentions
        if (hasMentions(content)) {
          const mentions = parseMentions(content);
          const users = await tx.query.usersTable.run();
          
          for (const mention of mentions) {
            if (mention.type === "user") {
              // Find the mentioned user
              const searchName = mention.name.toLowerCase();
              const mentionedUser = users.find(
                (u) =>
                  u.name.toLowerCase() === searchName ||
                  u.email.toLowerCase().split("@")[0] === searchName ||
                  u.name.toLowerCase().replace(/\s+/g, ".") === searchName ||
                  u.name.toLowerCase().replace(/\s+/g, "_") === searchName ||
                  u.name.toLowerCase().replace(/\s+/g, "-") === searchName
              );

              // Don't notify the author of their own message
              if (mentionedUser && mentionedUser.id !== authUser.id) {
                await tx.mutate.notificationsTable.insert({
                  id: nanoid(),
                  user_id: mentionedUser.id,
                  message_id: messageId,
                  channel_id: actualChannelId,
                  mention_type: "user",
                  is_read: false,
                  created_at: Date.now(),
                });
              }
            }
          }
        }
      },
      update: async (
        tx: Transaction<Schema>,
        {
          messageId,
          content,
        }: {
          messageId: string;
          content: string;
        }
      ) => {
        const message = await tx.query.messagesTable
          .where("id", messageId)
          .one();

        if (!message) {
          throw new Error("Message not found");
        }

        if (message.author_id !== authUser.id) {
          throw new Error("Only the message author can edit this message");
        }

        await tx.mutate.messagesTable.update({
          id: messageId,
          content,
          updated: true,
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        { messageId }: { messageId: string }
      ) => {
        const message = await tx.query.messagesTable
          .where("id", messageId)
          .one();

        if (!message) {
          throw new Error("Message not found");
        }

        if (message.author_id !== authUser.id) {
          throw new Error("Only the message author can delete this message");
        }

        // Delete reactions first
        const reactions = await tx.query.reactionsTable
          .where("message_id", messageId)
          .run();

        for (const reaction of reactions) {
          await tx.mutate.reactionsTable.delete({ id: reaction.id });
        }

        // Delete attachments
        const attachments = await tx.query.attachmentsTable
          .where("message_id", messageId)
          .run();

        for (const attachment of attachments) {
          await tx.mutate.attachmentsTable.delete({ id: attachment.id });
        }

        // Delete the message
        await tx.mutate.messagesTable.delete({ id: messageId });
      },
    },
    reactions: {
      create: async (
        tx: Transaction<Schema>,
        {
          messageId,
          reaction,
        }: {
          messageId: string;
          reaction: string;
        }
      ) => {
        const existing = await tx.query.reactionsTable
          .where("message_id", messageId)
          .where("user_id", authUser.id)
          .where("reaction", reaction)
          .one();

        if (existing) {
          return;
        }

        await tx.mutate.reactionsTable.insert({
          id: nanoid(),
          message_id: messageId,
          user_id: authUser.id,
          reaction,
          created_at: Date.now(),
        });
      },
      delete: async (
        tx: Transaction<Schema>,
        {
          messageId,
          reaction,
        }: {
          messageId: string;
          reaction: string;
        }
      ) => {
        const existing = await tx.query.reactionsTable
          .where("message_id", messageId)
          .where("user_id", authUser.id)
          .where("reaction", reaction)
          .one();

        if (existing) {
          await tx.mutate.reactionsTable.delete({ id: existing.id });
        }
      },
    },
    user: {
      insert: async (
        tx: Transaction<Schema>,
        { setupCode }: { setupCode: string }
      ) => {
        const { name, email, id } = authUser;
        void setupCode;

        await tx.mutate.usersTable.insert({
          id,
          name,
          email,
          image: "",
          created_at: Date.now(),
          role: "user",
        });
      },
    },
    channels: {
      create: async (
        tx: Transaction<Schema>,
        {
          name,
          isPrivate,
          userIds = [],
          groupIds = [],
        }: {
          name: string;
          isPrivate: boolean;
          userIds?: string[];
          groupIds?: string[];
        }
      ) => {
        await ensureAdminOrOwner(tx, authUser.id);
        const channelId = nanoid();

        await tx.mutate.channelsTable.insert({
          id: channelId,
          name,
          created_at: Date.now(),
          owner_id: authUser.id,
          is_private: isPrivate,
        });

        await addChannelMemberIfMissing(tx, channelId, authUser.id, "admin");

        await tx.mutate.channelUserAccess.insert({
          channel_id: channelId,
          user_id: authUser.id,
          can_write: true,
        });

        if (isPrivate) {
          await grantChannelAccess(tx, channelId, {
            userIds: userIds.filter((id) => id !== authUser.id),
            groupIds,
          });
        }
      },
      grantUser: async (
        tx: Transaction<Schema>,
        {
          channelId,
          userId,
        }: {
          channelId: string;
          userId: string;
        }
      ) => {
        await ensureChannelOwner(tx, channelId, authUser.id);

        await grantChannelAccess(tx, channelId, {
          userIds: [userId],
        });
      },
      revokeUser: async (
        tx: Transaction<Schema>,
        {
          channelId,
          userId,
        }: {
          channelId: string;
          userId: string;
        }
      ) => {
        await ensureChannelOwner(tx, channelId, authUser.id);

        await tx.mutate.channelUserAccess.delete({
          channel_id: channelId,
          user_id: userId,
        });

        await removeChannelMembershipIfNoAccess(tx, channelId, userId);
      },
      grantGroup: async (
        tx: Transaction<Schema>,
        {
          channelId,
          groupId,
        }: {
          channelId: string;
          groupId: string;
        }
      ) => {
        await ensureChannelOwner(tx, channelId, authUser.id);

        await grantChannelAccess(tx, channelId, {
          groupIds: [groupId],
        });
      },
      revokeGroup: async (
        tx: Transaction<Schema>,
        {
          channelId,
          groupId,
        }: {
          channelId: string;
          groupId: string;
        }
      ) => {
        await ensureChannelOwner(tx, channelId, authUser.id);

        await tx.mutate.channelGroupAccess.delete({
          channel_id: channelId,
          group_id: groupId,
        });

        const members = await tx.query.groupMembers
          .where("group_id", groupId)
          .run();

        for (const member of members) {
          await removeChannelMembershipIfNoAccess(
            tx,
            channelId,
            member.user_id
          );
        }
      },
      update: async (
        tx: Transaction<Schema>,
        {
          channelId,
          name,
          isPrivate,
          userIds,
          groupIds,
        }: {
          channelId: string;
          name?: string;
          isPrivate?: boolean;
          userIds?: string[];
          groupIds?: string[];
        }
      ) => {
        const channel = await ensureChannelOwnerOrPrivileged(
          tx,
          channelId,
          authUser.id
        );

        const payload: {
          id: string;
          name?: string;
          is_private?: boolean;
        } = { id: channelId };

        const trimmedName = name?.trim();
        if (trimmedName && trimmedName !== channel.name) {
          payload.name = trimmedName;
        }

        if (typeof isPrivate === "boolean") {
          payload.is_private = isPrivate;
        }

        if (payload.name !== undefined || payload.is_private !== undefined) {
          await tx.mutate.channelsTable.update(payload);
        }

        const finalIsPrivate =
          typeof isPrivate === "boolean"
            ? isPrivate
            : Boolean(channel.is_private);

        if (finalIsPrivate) {
          await syncPrivateChannelAccess(tx, channelId, channel.owner_id, {
            userIds,
            groupIds,
          });
        } else {
          await clearChannelPrivacyAccess(tx, channelId, channel.owner_id);
        }
      },
      delete: async (
        tx: Transaction<Schema>,
        { channelId }: { channelId: string }
      ) => {
        await ensureChannelOwnerOrPrivileged(tx, channelId, authUser.id);

        const messages = await tx.query.messagesTable
          .where("channel_id", channelId)
          .run();

        for (const message of messages) {
          const reactions = await tx.query.reactionsTable
            .where("message_id", message.id)
            .run();

          for (const reaction of reactions) {
            await tx.mutate.reactionsTable.delete({ id: reaction.id });
          }

          const attachments = await tx.query.attachmentsTable
            .where("message_id", message.id)
            .run();

          for (const attachment of attachments) {
            await tx.mutate.attachmentsTable.delete({ id: attachment.id });
          }

          await tx.mutate.messagesTable.delete({ id: message.id });
        }

        const groupAccess = await tx.query.channelGroupAccess
          .where("channel_id", channelId)
          .run();
        for (const access of groupAccess) {
          await tx.mutate.channelGroupAccess.delete({
            channel_id: channelId,
            group_id: access.group_id,
          });
        }

        const userAccess = await tx.query.channelUserAccess
          .where("channel_id", channelId)
          .run();
        for (const access of userAccess) {
          await tx.mutate.channelUserAccess.delete({
            channel_id: channelId,
            user_id: access.user_id,
          });
        }

        const members = await tx.query.channelMembers
          .where("channelId", channelId)
          .run();
        for (const member of members) {
          await tx.mutate.channelMembers.delete({
            channelId,
            userId: member.userId,
          });
        }

        await tx.mutate.channelsTable.delete({ id: channelId });
      },
    },
    groups: {
      create: async (
        tx: Transaction<Schema>,
        {
          name,
          memberIds = [],
        }: {
          name: string;
          memberIds?: string[];
        }
      ) => {
        await ensureAdminOrOwner(tx, authUser.id);
        const groupId = nanoid();
        await tx.mutate.groupsTable.insert({
          id: groupId,
          name,
          owner_id: authUser.id,
          created_at: Date.now(),
        });

        const uniqueMembers = Array.from(
          new Set([authUser.id, ...memberIds])
        );

        for (const memberId of uniqueMembers) {
          await tx.mutate.groupMembers.insert({
            group_id: groupId,
            user_id: memberId,
          });
        }
      },
      addMember: async (
        tx: Transaction<Schema>,
        {
          groupId,
          userId,
        }: {
          groupId: string;
          userId: string;
        }
      ) => {
        const group = await tx.query.groupsTable.where("id", groupId).one();
        if (!group) {
          throw new Error("Group not found");
        }
        if (group.owner_id !== authUser.id) {
          throw new Error("Only the group owner can add members");
        }

        const existing = await tx.query.groupMembers
          .where("group_id", groupId)
          .where("user_id", userId)
          .one();

        if (!existing) {
          await tx.mutate.groupMembers.insert({
            group_id: groupId,
            user_id: userId,
          });
        }

        const channelLinks = await tx.query.channelGroupAccess
          .where("group_id", groupId)
          .run();

        for (const link of channelLinks) {
          await addChannelMemberIfMissing(tx, link.channel_id, userId);
        }
      },
      removeMember: async (
        tx: Transaction<Schema>,
        {
          groupId,
          userId,
        }: {
          groupId: string;
          userId: string;
        }
      ) => {
        const group = await tx.query.groupsTable.where("id", groupId).one();
        if (!group) {
          throw new Error("Group not found");
        }
        if (group.owner_id !== authUser.id) {
          throw new Error("Only the group owner can remove members");
        }
        if (group.owner_id === userId) {
          throw new Error("Cannot remove the group owner");
        }

        const channelLinks = await tx.query.channelGroupAccess
          .where("group_id", groupId)
          .run();

        await tx.mutate.groupMembers.delete({
          group_id: groupId,
          user_id: userId,
        });

        for (const link of channelLinks) {
          await removeChannelMembershipIfNoAccess(
            tx,
            link.channel_id,
            userId
          );
        }
      },
    },
    notifications: {
      markAsRead: async (
        tx: Transaction<Schema>,
        { notificationId }: { notificationId: string }
      ) => {
        const notification = await tx.query.notificationsTable
          .where("id", notificationId)
          .one();

        if (!notification) {
          throw new Error("Notification not found");
        }

        if (notification.user_id !== authUser.id) {
          throw new Error("Only the notification owner can mark it as read");
        }

        await tx.mutate.notificationsTable.update({
          id: notificationId,
          is_read: true,
        });
      },
      markAllAsRead: async (tx: Transaction<Schema>) => {
        const notifications = await tx.query.notificationsTable
          .where("user_id", authUser.id)
          .where("is_read", false)
          .run();

        for (const notification of notifications) {
          await tx.mutate.notificationsTable.update({
            id: notification.id,
            is_read: true,
          });
        }
      },
      delete: async (
        tx: Transaction<Schema>,
        { notificationId }: { notificationId: string }
      ) => {
        const notification = await tx.query.notificationsTable
          .where("id", notificationId)
          .one();

        if (!notification) {
          throw new Error("Notification not found");
        }

        if (notification.user_id !== authUser.id) {
          throw new Error("Only the notification owner can delete it");
        }

        await tx.mutate.notificationsTable.delete({ id: notificationId });
      },
    },
  } as const satisfies CustomMutatorDefs;
}
