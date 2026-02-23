# Notification System Documentation

## Overview

This chat application now includes a comprehensive notification system for user mentions. When a user is mentioned in a message using the `@username` syntax, they receive a real-time notification.

## Features

### 1. **Real-time Notifications**
- Notifications are created automatically when users are mentioned in messages
- Uses Zero's real-time sync for instant updates without polling
- Notifications appear in the notification dropdown and dedicated notifications page

### 2. **Notification Dropdown**
- Bell icon in the top navigation bar
- Badge showing unread notification count
- Quick access to recent notifications (last 50)
- Mark individual notifications as read
- Mark all notifications as read at once
- Delete individual notifications
- Link to full notifications page

### 3. **Dedicated Notifications Page**
- Full-page view at `/chat/notifications`
- Shows all notifications with message previews
- Displays author, channel, and timestamp
- Visual distinction between read and unread notifications
- Bulk actions (mark all as read)

### 4. **Mention Detection**
- Automatically parses messages for `@username` mentions
- Supports various username formats:
  - Direct name: `@john`
  - Email prefix: `@john` (matches john@example.com)
  - Name with dots: `@john.doe`
  - Name with underscores: `@john_doe`
  - Name with hyphens: `@john-doe`
  - Quoted names: `@"John Doe"`

### 5. **Smart Notification Logic**
- Users don't receive notifications for their own messages
- Duplicate notifications are prevented
- Works for both regular messages and webhook messages

## Database Schema

### Notifications Table

```sql
CREATE TABLE "notifications" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "message_id" varchar(255) NOT NULL,
  "channel_id" varchar(255),
  "mention_type" varchar(50) NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone NOT NULL
);
```

**Fields:**
- `id`: Unique notification identifier
- `user_id`: User who receives the notification
- `message_id`: Message that triggered the notification
- `channel_id`: Channel where the mention occurred
- `mention_type`: Type of mention ('user' or 'channel')
- `is_read`: Whether the notification has been read
- `created_at`: Timestamp when notification was created

## API / Mutators

### Client Mutators

#### `notifications.markAsRead`
Marks a single notification as read.

```typescript
zero.mutate.notifications.markAsRead({ 
  notificationId: string 
});
```

#### `notifications.markAllAsRead`
Marks all unread notifications for the current user as read.

```typescript
zero.mutate.notifications.markAllAsRead();
```

#### `notifications.delete`
Deletes a notification.

```typescript
zero.mutate.notifications.delete({ 
  notificationId: string 
});
```

### Automatic Notification Creation

Notifications are automatically created when:
1. A message is inserted via `messages.insert` mutator
2. A webhook posts a message via `webhooks.post` mutator

The system:
- Parses the message content for mentions
- Looks up mentioned users
- Creates notification records for each valid mention
- Excludes the message author from receiving notifications

## Components

### `NotificationDropdown`
Location: `/components/chat/notification-dropdown.tsx`

A dropdown component that displays recent notifications with:
- Unread count badge
- List of recent notifications
- Quick actions (mark as read, delete)
- Link to full notifications page

**Usage:**
```tsx
<NotificationDropdown userId={currentUser.id} />
```

### `NotificationsClient`
Location: `/app/chat/(zero-boundary)/notifications/client.tsx`

Full-page notification center with:
- All notifications for the user
- Message previews
- Filtering and sorting
- Bulk actions

## Integration Points

### 1. Message Creation
File: `/app/zero/mutators.ts`

When a message is created:
```typescript
// After inserting message
if (hasMentions(content)) {
  const mentions = parseMentions(content);
  // Create notifications for each mention
}
```

### 2. Webhook Messages
File: `/app/zero/server_mutators.ts`

Webhook messages also trigger notifications using the same logic.

### 3. Topbar Integration
File: `/components/topbar.tsx`

The notification dropdown is conditionally integrated into the main navigation:
```tsx
{isInZeroBoundary && <NotificationDropdown userId={user.id} />}
```

**Note**: The notification dropdown only appears when you're inside Zero-boundary routes:
- `/chat/channels/*`
- `/chat/notifications`
- `/chat/traffic`

This is because the dropdown requires the `ZeroProvider` context which is only available inside the `(zero-boundary)` folder structure.

## User Experience

### Notification Flow
1. User A mentions User B in a message: `"Hey @john, check this out!"`
2. System parses the mention and finds User B (john)
3. Notification is created and synced in real-time
4. User B sees:
   - Badge on bell icon with unread count
   - Notification in dropdown
   - Notification on dedicated page
5. User B clicks notification → navigates to channel and marks as read
6. Badge count decreases

### Visual Indicators
- **Unread notifications**: Blue accent background, blue left border
- **Read notifications**: Normal background
- **Badge**: Red circle with count on bell icon
- **Timestamps**: Relative time (e.g., "5m ago", "2h ago")

## Permissions

The notification system respects user permissions:
- Users can only see their own notifications
- Users can only mark their own notifications as read
- Users can only delete their own notifications

## Performance Considerations

1. **Query Optimization**: Notifications are queried with:
   - User ID filter
   - Descending order by creation time
   - Limit of 50 in dropdown (unlimited on page)

2. **Real-time Sync**: Zero handles efficient real-time updates without manual polling

3. **Mention Parsing**: Only performed when message contains `@` or `#` characters

## Future Enhancements

Potential improvements for the notification system:

1. **Email Notifications**: Send email for unread notifications after a delay
2. **Push Notifications**: Browser push notifications for desktop
3. **Notification Preferences**: Allow users to customize notification settings
4. **Channel Mentions**: Support `@channel` or `@everyone` mentions
5. **Notification Sounds**: Optional sound alerts for new notifications
6. **Read Receipts**: Show when notifications were read
7. **Notification Grouping**: Group multiple mentions from same channel
8. **Mute Channels**: Allow users to mute notifications from specific channels

## Testing

To test the notification system:

1. Create two user accounts
2. Log in as User A
3. Mention User B in a message: `@userb hello!`
4. Log in as User B
5. Check the notification dropdown (should show badge and notification)
6. Click notification to navigate to channel
7. Verify notification is marked as read

## Migration

To apply the database schema changes:

```bash
# Generate migration (already done)
bunx drizzle-kit generate

# Apply migration to database
bunx drizzle-kit migrate
```

The migration file is located at: `/drizzle/0000_purple_thunderbolts.sql`

## Troubleshooting

### Notifications not appearing
- Check that the user exists in the database
- Verify the mention format matches username
- Ensure Zero sync is working properly

### Badge count incorrect
- Refresh the page to resync
- Check browser console for errors
- Verify notification queries are working

### Notifications not marked as read
- Check user permissions
- Verify mutator is being called
- Check for JavaScript errors in console

