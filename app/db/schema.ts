import {
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRolesEnum = pgEnum("user_roles", ["user", "admin", "owner"]);
export const rolesEnum = pgEnum("roles", ["guest", "member", "admin"]);

export const usersTable = pgTable("users", {
  id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  image: varchar({ length: 255 }).notNull(),
  role: userRolesEnum("role").notNull().default("user"),
  created_at: timestamp({ withTimezone: true }).notNull(),
});

export const channelsTable = pgTable("channels", {
  id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }).notNull(),
  owner_id: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id),
  is_private: boolean().notNull().default(false),
});

export const groupsTable = pgTable("groups", {
  id: varchar({ length: 255 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  owner_id: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id),
  created_at: timestamp({ withTimezone: true }).notNull(),
});

export const channelMembers = pgTable(
  "channel_members",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id),
    channelId: varchar("channel_id")
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    role: rolesEnum("role").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.channelId] })]
);

export const groupMembers = pgTable(
  "group_members",
  {
    group_id: varchar({ length: 255 })
      .notNull()
      .references(() => groupsTable.id),
    user_id: varchar({ length: 255 })
      .notNull()
      .references(() => usersTable.id),
  },
  (t) => [primaryKey({ columns: [t.group_id, t.user_id] })]
);

export const channelGroupAccess = pgTable(
  "channel_group_access",
  {
    channel_id: varchar({ length: 255 })
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    group_id: varchar({ length: 255 })
      .notNull()
      .references(() => groupsTable.id),
    can_write: boolean().notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.channel_id, t.group_id] })]
);

export const channelUserAccess = pgTable(
  "channel_user_access",
  {
    channel_id: varchar({ length: 255 })
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    user_id: varchar({ length: 255 })
      .notNull()
      .references(() => usersTable.id),
    can_write: boolean().notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.channel_id, t.user_id] })]
);

export const messagesTable = pgTable("messages", {
  id: varchar({ length: 255 }).primaryKey(),
  content: text().notNull(),
  created_at: timestamp({ withTimezone: true }).notNull(),
  author_id: varchar({ length: 255 }).notNull(),
  channel_id: varchar({ length: 255 }),
  direct_to_id: varchar({ length: 255 }),
  parent_id: varchar({ length: 255 }),
  updated: boolean().notNull().default(false),
  webhook_id: varchar({ length: 255 }),
});

export const reactionsTable = pgTable("reactions", {
  id: varchar({ length: 255 }).primaryKey(),
  message_id: varchar({ length: 255 }).notNull(),
  user_id: varchar({ length: 255 }).notNull(),
  reaction: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }).notNull(),
});

export const attachmentsTable = pgTable("attachments", {
  id: varchar({ length: 255 }).primaryKey(),
  message_id: varchar({ length: 255 })
    .notNull()
    .references(() => messagesTable.id),
  filename: varchar({ length: 255 }).notNull(),
  file_type: varchar({ length: 255 }).notNull(),
  file_size: varchar({ length: 255 }).notNull(),
  storage_path: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }).notNull(),
});

export const channelGithubIntegrationsTable = pgTable(
  "channel_github_integrations",
  {
    id: varchar({ length: 255 }).primaryKey(),
    channel_id: varchar({ length: 255 })
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    repo_owner: varchar({ length: 255 }).notNull(),
    repo_name: varchar({ length: 255 }).notNull(),
    access_token: text().notNull(),
    connected_by: varchar({ length: 255 })
      .notNull()
      .references(() => usersTable.id),
    created_at: timestamp({ withTimezone: true }).notNull(),
  }
);

export const channelGitlabIntegrationsTable = pgTable(
  "channel_gitlab_integrations",
  {
    id: varchar({ length: 255 }).primaryKey(),
    channel_id: varchar({ length: 255 })
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    project_id: varchar({ length: 255 }).notNull(),
    project_path: varchar({ length: 255 }).notNull(),
    access_token: text().notNull(),
    connected_by: varchar({ length: 255 })
      .notNull()
      .references(() => usersTable.id),
    created_at: timestamp({ withTimezone: true }).notNull(),
  }
);

export const channelWebhooksTable = pgTable("channel_webhooks", {
  id: varchar({ length: 255 }).primaryKey(),
  channel_id: varchar({ length: 255 })
    .notNull()
    .references(() => channelsTable.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  token_hash: text().notNull(),
  created_by: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id),
  created_at: timestamp({ withTimezone: true }).notNull(),
  last_used_at: timestamp({ withTimezone: true }),
});

export const notificationsTable = pgTable("notifications", {
  id: varchar({ length: 255 }).primaryKey(),
  user_id: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.id),
  message_id: varchar({ length: 255 })
    .notNull()
    .references(() => messagesTable.id),
  channel_id: varchar({ length: 255 })
    .references(() => channelsTable.id, { onDelete: "cascade" }),
  mention_type: varchar({ length: 50 }).notNull(), // 'user' or 'channel'
  is_read: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull(),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  author: many(messagesTable, { relationName: "author" }),
  sent_direct_messages: many(messagesTable, { relationName: "direct_to" }),
  members: many(channelMembers),
  ownedChannels: many(channelsTable, { relationName: "owner" }),
  ownedGroups: many(groupsTable, { relationName: "owner" }),
  groupMemberships: many(groupMembers),
  channelAccess: many(channelUserAccess),
  notifications: many(notificationsTable),
}));

export const channelsRelations = relations(channelsTable, ({ many, one }) => ({
  messages: many(messagesTable),
  members: many(channelMembers),
  userAccess: many(channelUserAccess),
  groupAccess: many(channelGroupAccess),
  githubIntegrations: many(channelGithubIntegrationsTable),
  gitlabIntegrations: many(channelGitlabIntegrationsTable),
  owner: one(usersTable, {
    fields: [channelsTable.owner_id],
    references: [usersTable.id],
    relationName: "owner",
  }),
}));

export const groupsRelations = relations(groupsTable, ({ many, one }) => ({
  members: many(groupMembers),
  channelAccess: many(channelGroupAccess),
  owner: one(usersTable, {
    fields: [groupsTable.owner_id],
    references: [usersTable.id],
    relationName: "owner",
  }),
}));

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
  user: one(usersTable, {
    fields: [channelMembers.userId],
    references: [usersTable.id],
  }),
  channel: one(channelsTable, {
    fields: [channelMembers.channelId],
    references: [channelsTable.id],
  }),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groupsTable, {
    fields: [groupMembers.group_id],
    references: [groupsTable.id],
  }),
  user: one(usersTable, {
    fields: [groupMembers.user_id],
    references: [usersTable.id],
  }),
}));

export const channelGroupAccessRelations = relations(
  channelGroupAccess,
  ({ one }) => ({
    channel: one(channelsTable, {
      fields: [channelGroupAccess.channel_id],
      references: [channelsTable.id],
    }),
    group: one(groupsTable, {
      fields: [channelGroupAccess.group_id],
      references: [groupsTable.id],
    }),
  })
);

export const channelUserAccessRelations = relations(
  channelUserAccess,
  ({ one }) => ({
    channel: one(channelsTable, {
      fields: [channelUserAccess.channel_id],
      references: [channelsTable.id],
    }),
    user: one(usersTable, {
      fields: [channelUserAccess.user_id],
      references: [usersTable.id],
    }),
  })
);

export const messagesRelations = relations(messagesTable, ({ one, many }) => ({
  author: one(usersTable, {
    fields: [messagesTable.author_id],
    references: [usersTable.id],
    relationName: "author",
  }),
  channel: one(channelsTable, {
    fields: [messagesTable.channel_id],
    references: [channelsTable.id],
  }),
  direct_to: one(usersTable, {
    fields: [messagesTable.direct_to_id],
    references: [usersTable.id],
    relationName: "direct_to",
  }),
  parent: one(messagesTable, {
    fields: [messagesTable.parent_id],
    references: [messagesTable.id],
    relationName: "parent",
  }),
  webhook: one(channelWebhooksTable, {
    fields: [messagesTable.webhook_id],
    references: [channelWebhooksTable.id],
    relationName: "webhook",
  }),
  reactions: many(reactionsTable),
  attachments: many(attachmentsTable),
  replies: many(messagesTable, {
    relationName: "parent",
  }),
  notifications: many(notificationsTable),
}));

export const reactionsRelations = relations(reactionsTable, ({ one }) => ({
  message: one(messagesTable, {
    fields: [reactionsTable.message_id],
    references: [messagesTable.id],
  }),
  user: one(usersTable, {
    fields: [reactionsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const attachmentsRelations = relations(attachmentsTable, ({ one }) => ({
  message: one(messagesTable, {
    fields: [attachmentsTable.message_id],
    references: [messagesTable.id],
  }),
}));

export const channelGithubIntegrationsRelations = relations(
  channelGithubIntegrationsTable,
  ({ one }) => ({
    channel: one(channelsTable, {
      fields: [channelGithubIntegrationsTable.channel_id],
      references: [channelsTable.id],
    }),
    connectedBy: one(usersTable, {
      fields: [channelGithubIntegrationsTable.connected_by],
      references: [usersTable.id],
    }),
  })
);

export const channelGitlabIntegrationsRelations = relations(
  channelGitlabIntegrationsTable,
  ({ one }) => ({
    channel: one(channelsTable, {
      fields: [channelGitlabIntegrationsTable.channel_id],
      references: [channelsTable.id],
    }),
    connectedBy: one(usersTable, {
      fields: [channelGitlabIntegrationsTable.connected_by],
      references: [usersTable.id],
    }),
  })
);

export const channelWebhooksRelations = relations(
  channelWebhooksTable,
  ({ one, many }) => ({
    channel: one(channelsTable, {
      fields: [channelWebhooksTable.channel_id],
      references: [channelsTable.id],
    }),
    createdBy: one(usersTable, {
      fields: [channelWebhooksTable.created_by],
      references: [usersTable.id],
    }),
    messages: many(messagesTable, {
      relationName: "webhook",
    }),
  })
);

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id],
  }),
  message: one(messagesTable, {
    fields: [notificationsTable.message_id],
    references: [messagesTable.id],
  }),
  channel: one(channelsTable, {
    fields: [notificationsTable.channel_id],
    references: [channelsTable.id],
  }),
}));
