"use client";

import { useQuery } from "@rocicorp/zero/react";
import { useTranslations } from 'next-intl';
import { Bell, Check, CheckCheck, Trash2, AtSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { NotificationsTable } from "@/zero-schema.gen";
import { useAppZero } from "@/app/zero/use-zero";

interface NotificationsClientProps {
  userId: string;
}

export function NotificationsClient({ userId }: NotificationsClientProps) {
  const t = useTranslations('notifications');
  const zero = useAppZero();

  const [notifications] = useQuery(
    zero.query.notificationsTable
      .where("user_id", userId)
      .orderBy("created_at", "desc")
  );

  const [users] = useQuery(zero.query.usersTable);
  const [channels] = useQuery(zero.query.channelsTable);
  const [messages] = useQuery(zero.query.messagesTable);

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

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t('justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('daysAgo', { count: days });
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return t('weeksAgo', { count: weeks });
    const months = Math.floor(days / 30);
    return t('monthsAgo', { count: months });
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? (unreadCount === 1 ? t('unreadCount', { count: unreadCount }) : t('unreadCountPlural', { count: unreadCount }))
              : t('allCaughtUp')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            {t('markAllAsRead')}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-20 text-center">
          <Bell className="h-16 w-16 text-muted-foreground/50" />
          <div>
            <h3 className="text-lg font-semibold">{t('noNotificationsYet')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('youllBeNotified')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const message = messages.find((m) => m.id === notification.message_id);
            const author = message ? users.find((u) => u.id === message.author_id) : null;
            const channel = channels.find((c) => c.id === notification.channel_id);

            return (
              <div
                key={notification.id}
                className={cn(
                  "group relative flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
                  !notification.is_read && "border-primary/50 bg-primary/5"
                )}
              >
                {!notification.is_read && (
                  <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-primary" />
                )}

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <AtSign className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        <span className="font-semibold">{author?.name || t('someone')}</span>{" "}
                        {t('mentionedYouIn')}{" "}
                        <Link
                          href={`/chat/channels/${notification.channel_id}`}
                          className="font-semibold text-primary hover:underline"
                          onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                        >
                          #{channel?.name || t('unknown')}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span className="text-xs">{t('markRead')}</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {message && (
                    <Link
                      href={`/chat/channels/${notification.channel_id}`}
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                      className="block rounded-md bg-muted/50 p-3 text-sm hover:bg-muted"
                    >
                      <p className="line-clamp-3">{message.content}</p>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

