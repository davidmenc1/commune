"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@rocicorp/zero/react";
import { useTranslations } from 'next-intl';
import { Hash, Lock, AtSign, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { UsersTable, ChannelsTable } from "@/zero-schema.gen";

export type MentionType = "user" | "channel";

export interface MentionPickerItem {
  type: MentionType;
  id: string;
  name: string;
  displayName: string;
  image?: string;
  isPrivate?: boolean;
}

interface MentionPickerProps {
  type: MentionType;
  query: string;
  users: readonly UsersTable[];
  channels: readonly ChannelsTable[];
  onSelect: (item: MentionPickerItem) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function MentionPicker({
  type,
  query,
  users,
  channels,
  onSelect,
  onClose,
  position,
}: MentionPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const searchTerm = query.toLowerCase();
    
    if (type === "user") {
      return users
        .filter(
          (user) =>
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        )
        .slice(0, 8)
        .map((user) => ({
          type: "user" as const,
          id: user.id,
          name: user.name,
          displayName: user.name,
          image: user.image,
        }));
    } else {
      return channels
        .filter((channel) =>
          channel.name.toLowerCase().includes(searchTerm)
        )
        .slice(0, 8)
        .map((channel) => ({
          type: "channel" as const,
          id: channel.id,
          name: channel.name,
          displayName: channel.name,
          isPrivate: !!channel.is_private,
        }));
    }
  }, [type, query, users, channels]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % items.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (items[selectedIndex]) {
            onSelect(items[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

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
      "bg-rose-500/15 text-rose-600",
      "bg-orange-500/15 text-orange-600",
      "bg-amber-500/15 text-amber-600",
      "bg-emerald-500/15 text-emerald-600",
      "bg-teal-500/15 text-teal-600",
      "bg-cyan-500/15 text-cyan-600",
      "bg-blue-500/15 text-blue-600",
      "bg-indigo-500/15 text-indigo-600",
      "bg-violet-500/15 text-violet-600",
      "bg-purple-500/15 text-purple-600",
      "bg-pink-500/15 text-pink-600",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        className="fixed z-50 w-64 rounded-lg border bg-popover p-2 shadow-lg"
        style={{ 
          top: position.top, 
          left: position.left,
          transform: 'translateY(-100%)' // Position above the calculated point
        }}
      >
        <p className="px-2 py-1.5 text-sm text-muted-foreground">
          No {type === "user" ? "users" : "channels"} found
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-72 rounded-lg border bg-popover shadow-lg overflow-hidden"
      style={{ 
        top: position.top, 
        left: position.left,
        transform: 'translateY(-100%)' // Position above the calculated point
      }}
    >
      <div className="p-1.5 border-b bg-muted/30">
        <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {type === "user" ? "People" : "Channels"}
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {item.type === "user" ? (
              <>
                <Avatar className="h-7 w-7">
                  {item.image && <AvatarImage src={item.image} alt={item.name} />}
                  <AvatarFallback className={cn("text-xs", getAvatarColor(item.name))}>
                    {getInitials(item.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 truncate text-left font-medium">
                  {item.displayName}
                </span>
              </>
            ) : (
              <>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                  {item.isPrivate ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 truncate text-left font-medium">
                  {item.displayName}
                </span>
                {item.isPrivate && <PrivateLabel />}
              </>
            )}
          </button>
        ))}
      </div>
      <div className="p-1.5 border-t bg-muted/30">
        <p className="px-2 text-[10px] text-muted-foreground">
          <kbd className="rounded bg-muted px-1 font-mono text-[10px]">↑</kbd>{" "}
          <kbd className="rounded bg-muted px-1 font-mono text-[10px]">↓</kbd> to navigate{" "}
          <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Enter</kbd> to select{" "}
          <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}

export interface MentionState {
  isActive: boolean;
  type: MentionType;
  query: string;
  startIndex: number;
  position: { top: number; left: number };
}

/**
 * Hook to detect and manage mention state from input
 */
export function useMentionState(
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  value: string
) {
  const [mentionState, setMentionState] = useState<MentionState | null>(null);

  const checkForMention = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const cursorPos = input.selectionStart ?? 0;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Check for @ or # trigger
    const atMatch = textBeforeCursor.match(/@([^\s@#]*)$/);
    const hashMatch = textBeforeCursor.match(/#([^\s@#]*)$/);

    if (atMatch || hashMatch) {
      const match = atMatch || hashMatch;
      const type: MentionType = atMatch ? "user" : "channel";
      const query = match![1];
      const startIndex = cursorPos - match![0].length;

      // Get position for the picker
      const rect = input.getBoundingClientRect();
      // Position picker so its bottom edge is just above the input
      // Using transform in CSS to position relative to bottom
      const position = {
        top: rect.top - 16, // Small gap above the input
        left: rect.left,
      };

      setMentionState({
        isActive: true,
        type,
        query,
        startIndex,
        position,
      });
    } else {
      setMentionState(null);
    }
  }, [inputRef, value]);

  const closeMention = useCallback(() => {
    setMentionState(null);
  }, []);

  const insertMention = useCallback(
    (item: MentionPickerItem, setValue: (value: string) => void) => {
      if (!mentionState || !inputRef.current) return;

      const input = inputRef.current;
      const cursorPos = input.selectionStart ?? 0;
      
      // Build the mention text
      const prefix = item.type === "user" ? "@" : "#";
      const mentionText = item.name.includes(" ")
        ? `${prefix}"${item.name}" `
        : `${prefix}${item.name} `;

      // Replace the trigger and query with the mention
      const before = value.slice(0, mentionState.startIndex);
      const after = value.slice(cursorPos);
      const newValue = before + mentionText + after;

      setValue(newValue);
      setMentionState(null);

      // Set cursor position after the mention
      requestAnimationFrame(() => {
        const newPos = mentionState.startIndex + mentionText.length;
        input.setSelectionRange(newPos, newPos);
        input.focus();
      });
    },
    [mentionState, inputRef, value]
  );

  return {
    mentionState,
    checkForMention,
    closeMention,
    insertMention,
  };
}

function PrivateLabel() {
  const t = useTranslations('common');
  return <span className="text-xs text-muted-foreground">{t('private')}</span>;
}


