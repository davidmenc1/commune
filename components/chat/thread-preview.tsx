"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessagesTable, UsersTable } from "@/zero-schema.gen";

interface ThreadPreviewProps {
  parentMessage: MessagesTable & {
    replies?: readonly MessagesTable[];
  };
  users: readonly UsersTable[];
  onOpenThread: () => void;
}

export function ThreadPreview({
  parentMessage,
  users,
  onOpenThread,
}: ThreadPreviewProps) {
  const t = useTranslations("channelDetail");
  const replies = parentMessage.replies || [];
  const replyCount = replies.length;

  if (replyCount === 0) {
    return null;
  }

  // Get latest reply
  const latestReply = replies[replies.length - 1];
  const latestReplyAuthor = users.find((u) => u.id === latestReply?.author_id);

  // Get unique repliers for avatars (max 3)
  const uniqueRepliers = Array.from(
    new Set(replies.map((r) => r.author_id))
  ).slice(0, 3);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500/10 text-red-600",
      "bg-orange-500/10 text-orange-600",
      "bg-amber-500/10 text-amber-600",
      "bg-emerald-500/10 text-emerald-600",
      "bg-teal-500/10 text-teal-600",
      "bg-cyan-500/10 text-cyan-600",
      "bg-blue-500/10 text-blue-600",
      "bg-indigo-500/10 text-indigo-600",
      "bg-violet-500/10 text-violet-600",
      "bg-purple-500/10 text-purple-600",
      "bg-pink-500/10 text-pink-600",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <button
      onClick={onOpenThread}
      className={cn(
        "flex items-start gap-2 mt-1 px-3 py-2 rounded-lg",
        "hover:bg-primary/5 transition-colors text-left w-full group"
      )}
    >
      {/* Replier avatars */}
      <div className="flex items-center -space-x-2 shrink-0">
        {uniqueRepliers.map((replierId) => {
          const replier = users.find((u) => u.id === replierId);
          const name = replier?.name || "Unknown";
          return (
            <Avatar key={replierId} className="h-5 w-5 border-2 border-background">
              <AvatarFallback
                className={cn("text-[10px] font-medium", getAvatarColor(name))}
              >
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>

      {/* Reply info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-primary group-hover:underline">
            {replyCount === 1
              ? t("replies", { count: 1 })
              : t("replies", { count: replyCount })}
          </span>
          {latestReply && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground truncate">
                Last reply {formatTime(latestReply.created_at)}
              </span>
            </>
          )}
        </div>

        {/* Latest reply preview */}
        {latestReply && latestReplyAuthor && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            <span className="font-medium">{latestReplyAuthor.name}:</span>{" "}
            {latestReply.content}
          </div>
        )}
      </div>

      {/* Thread icon */}
      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
    </button>
  );
}
