import {
  ANYONE_CAN_DO_ANYTHING,
  createBuilder,
  definePermissions,
} from "@rocicorp/zero";
import { schema, type Schema } from "@/zero-schema.gen";
export const builder = createBuilder(schema);
export const permissions = definePermissions(schema, () => ({
  usersTable: ANYONE_CAN_DO_ANYTHING,
  channelsTable: ANYONE_CAN_DO_ANYTHING,
  channelMembers: ANYONE_CAN_DO_ANYTHING,
  messagesTable: ANYONE_CAN_DO_ANYTHING,
  reactionsTable: ANYONE_CAN_DO_ANYTHING,
  attachmentsTable: ANYONE_CAN_DO_ANYTHING,
  channelWebhooksTable: ANYONE_CAN_DO_ANYTHING,
  notificationsTable: ANYONE_CAN_DO_ANYTHING,
}));

export { schema, type Schema };
