"use client";

import { useState, useMemo } from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Hash, Lock, AtSign } from "lucide-react";
import { UserCard } from "./user-card";
import { cn } from "@/lib/utils";
import type { Mention } from "@/lib/mention-parser";
import type { UsersTable, ChannelsTable } from "@/zero-schema.gen";

interface UserMentionProps {
  mention: Mention;
  users: readonly UsersTable[];
  currentUserId?: string;
}

export function UserMention({ mention, users, currentUserId }: UserMentionProps) {
  const user = useMemo(() => {
    const searchName = mention.name.toLowerCase();
    return users.find(
      (u) =>
        u.name.toLowerCase() === searchName ||
        u.email.toLowerCase().split("@")[0] === searchName ||
        u.name.toLowerCase().replace(/\s+/g, ".") === searchName ||
        u.name.toLowerCase().replace(/\s+/g, "_") === searchName ||
        u.name.toLowerCase().replace(/\s+/g, "-") === searchName
    );
  }, [mention.name, users]);

  const isCurrentUser = user?.id === currentUserId;

  if (!user) {
    // Unknown user - render as plain text
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-sm font-medium bg-muted text-muted-foreground">
        <AtSign className="h-3 w-3 mr-0.5 opacity-60" />
        {mention.name}
      </span>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-sm font-medium transition-colors",
            isCurrentUser
              ? "bg-primary/20 text-primary hover:bg-primary/30"
              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25"
          )}
        >
          <AtSign className="h-3 w-3 mr-0.5 opacity-70" />
          {user.name}
        </button>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-auto p-0" 
        side="top" 
        align="start"
        sideOffset={5}
      >
        <UserCard user={user} />
      </HoverCardContent>
    </HoverCard>
  );
}

interface ChannelMentionProps {
  mention: Mention;
  channels: readonly ChannelsTable[];
}

export function ChannelMention({ mention, channels }: ChannelMentionProps) {
  const channel = useMemo(() => {
    const searchName = mention.name.toLowerCase();
    return channels.find(
      (c) =>
        c.name.toLowerCase() === searchName ||
        c.name.toLowerCase().replace(/\s+/g, "-") === searchName ||
        c.name.toLowerCase().replace(/\s+/g, "_") === searchName
    );
  }, [mention.name, channels]);

  if (!channel) {
    // Unknown channel - render as plain text
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-sm font-medium bg-muted text-muted-foreground">
        <Hash className="h-3 w-3 mr-0.5 opacity-60" />
        {mention.name}
      </span>
    );
  }

  return (
    <Link
      href={`/chat/channels/${channel.id}`}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-sm font-medium transition-colors",
        channel.is_private
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
          : "bg-teal-500/15 text-teal-600 dark:text-teal-400 hover:bg-teal-500/25"
      )}
    >
      {channel.is_private ? (
        <Lock className="h-3 w-3 mr-0.5 opacity-70" />
      ) : (
        <Hash className="h-3 w-3 mr-0.5 opacity-70" />
      )}
      {channel.name}
    </Link>
  );
}



