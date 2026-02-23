"use client";

import { useState } from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { Bell, Check, CheckCheck, Trash2, AtSign } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { NotificationsTable, UsersTable, ChannelsTable } from "@/zero-schema.gen";

interface NotificationItemProps {
  notification: NotificationsTable;
  users: readonly UsersTable[];
  channels: readonly ChannelsTable[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({
  notification,
  users,
  channels,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const author = users.find((u) => {
    // Find the message author by looking at the message
    return true; // We'll need to get this from the message
  });

  const channel = channels.find((c) => c.id === notification.channel_id);

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 border-b p-3 transition-colors hover:bg-muted/50",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/chat/channels/${notification.channel_id}`}
          className="flex-1 space-y-1"
          onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
        >
          <div className="flex items-center gap-2">
            <AtSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              You were mentioned in #{channel?.name || "unknown"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {timeAgo(notification.created_at)}
          </p>
        </Link>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.preventDefault();
                onMarkAsRead(notification.id);
              }}
              title="Mark as read"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.preventDefault();
              onDelete(notification.id);
            }}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!notification.is_read && (
        <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
      )}
    </div>
  );
}

interface NotificationDropdownProps {
  userId: string;
}

export function NotificationDropdown({ userId }: NotificationDropdownProps) {
  const zero = useZero();
  const [isOpen, setIsOpen] = useState(false);

  // Query notifications for the current user
  const [notifications] = useQuery(
    zero.query.notificationsTable
      .where("user_id", userId)
      .orderBy("created_at", "desc")
      .limit(50)
  );

  const [users] = useQuery(zero.query.usersTable);
  const [channels] = useQuery(zero.query.channelsTable);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = (notificationId: string) => {
    zero.mutate.notifications.markAsRead({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    zero.mutate.notifications.markAllAsRead();
  };

  const handleDelete = (notificationId: string) => {
    zero.mutate.notifications.delete({ notificationId });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground">
                You'll be notified when someone mentions you
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  users={users}
                  channels={channels}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                asChild
              >
                <Link href="/chat/notifications">View all notifications</Link>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

