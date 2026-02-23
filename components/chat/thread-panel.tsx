"use client";

import { useQuery, useZero } from "@rocicorp/zero/react";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Paperclip, Loader2, FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getThreadMessages, getMessageById, getAllUsers, getAllChannels } from "@/app/chat/(zero-boundary)/channels/query";
import type {
  MessagesTable,
  ReactionsTable,
  UsersTable,
  AttachmentsTable,
  ChannelsTable,
} from "@/zero-schema.gen";
import { UnifiedMessageContent } from "./message-content";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { UserCard } from "./user-card";
import { MentionPicker, useMentionState } from "./mention-picker";
import EmojiPicker, { Theme } from "emoji-picker-react";

interface ThreadPanelProps {
  parentMessageId: string;
  channelId: string;
  currentUserId?: string;
  jwt: string;
  onClose: () => void;
  hasGitHubIntegration?: boolean;
  hasGitLabIntegration?: boolean;
}

type UploadedAttachment = {
  id: string;
  filename: string;
  file_type: string;
  file_size: string;
  storage_path: string;
};

type PendingFile = {
  file: File;
  preview?: string;
};

export function ThreadPanel({
  parentMessageId,
  channelId,
  currentUserId,
  jwt,
  onClose,
  hasGitHubIntegration = false,
  hasGitLabIntegration = false,
}: ThreadPanelProps) {
  const t = useTranslations("channelDetail");
  const tCommon = useTranslations("common");
  const [parentMessage] = useQuery(getMessageById({ jwt }, { messageId: parentMessageId }));
  const [replies] = useQuery(getThreadMessages({ jwt }, { parentId: parentMessageId }));
  const [users] = useQuery(getAllUsers({ jwt }));
  const [channels] = useQuery(getAllChannels({ jwt }));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies?.length]);

  // ESC to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!parentMessage) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] lg:w-[700px] bg-background border-l shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-lg">{t("threadTitle")}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="px-4 py-4 space-y-4">
            {/* Parent Message */}
            <div className="pb-4 border-b">
              <ThreadMessageRow
                message={parentMessage}
                users={users || []}
                channels={channels || []}
                currentUserId={currentUserId}
                channelId={channelId}
                jwt={jwt}
                hasGitHubIntegration={hasGitHubIntegration}
                hasGitLabIntegration={hasGitLabIntegration}
                isParent
              />
            </div>

            {/* Replies */}
            {replies && replies.length > 0 ? (
              <div className="space-y-1">
                {replies.map((reply) => (
                  <ThreadMessageRow
                    key={reply.id}
                    message={reply}
                    users={users || []}
                    channels={channels || []}
                    currentUserId={currentUserId}
                    channelId={channelId}
                    jwt={jwt}
                    hasGitHubIntegration={hasGitHubIntegration}
                    hasGitLabIntegration={hasGitLabIntegration}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No replies yet. Be the first to reply!
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t bg-background p-4">
          <ThreadComposer
            parentId={parentMessageId}
            channelId={channelId}
            jwt={jwt}
            users={users || []}
            channels={channels || []}
          />
        </div>
      </div>
    </>
  );
}

function ThreadMessageRow({
  message,
  users,
  channels,
  currentUserId,
  channelId,
  jwt,
  hasGitHubIntegration,
  hasGitLabIntegration,
  isParent = false,
}: {
  message: MessagesTable & {
    reactions?: readonly ReactionsTable[];
    attachments?: readonly AttachmentsTable[];
  };
  users: readonly UsersTable[];
  channels: readonly ChannelsTable[];
  currentUserId?: string;
  channelId: string;
  jwt: string;
  hasGitHubIntegration: boolean;
  hasGitLabIntegration: boolean;
  isParent?: boolean;
}) {
  const zero = useZero();
  const author = users.find((u) => u.id === message.author_id);
  const reactions = message.reactions || [];
  const attachments = message.attachments || [];

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

  const reactionCounts = reactions.reduce(
    (acc, r) => {
      acc[r.reaction] = (acc[r.reaction] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const userReactions = new Set(
    reactions.filter((r) => r.user_id === currentUserId).map((r) => r.reaction)
  );

  const toggleReaction = (emoji: string) => {
    if (userReactions.has(emoji)) {
      zero.mutate.reactions.delete({ messageId: message.id, reaction: emoji });
    } else {
      zero.mutate.reactions.create({ messageId: message.id, reaction: emoji });
    }
  };

  const getReactionUsers = (emoji: string) => {
    const reactorIds = reactions
      .filter((r) => r.reaction === emoji)
      .map((r) => r.user_id);
    const names = reactorIds.map(
      (id) => users.find((u) => u.id === id)?.name || "Unknown"
    );
    if (names.length === 0) return "";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} and ${names.length - 3} others`;
  };

  const formatFileSize = (sizeStr: string) => {
    const size = parseInt(sizeStr, 10);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (fileType: string) => fileType.startsWith("image/");

  return (
    <div className={cn("flex gap-3", isParent && "bg-muted/30 rounded-lg p-3")}>
      <div className="w-9 shrink-0">
        {author ? (
          <HoverCard openDelay={300} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button className="cursor-pointer">
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-medium",
                      getAvatarColor(author.name)
                    )}
                  >
                    {getInitials(author.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-auto p-0" side="right" align="start">
              <UserCard user={author} />
            </HoverCardContent>
          </HoverCard>
        ) : (
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-medium bg-muted">
              ?
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          {author ? (
            <HoverCard openDelay={300} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button className="font-semibold text-sm hover:underline cursor-pointer">
                  {author.name}
                </button>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto p-0" side="top" align="start">
                <UserCard user={author} />
              </HoverCardContent>
            </HoverCard>
          ) : (
            <span className="font-semibold text-sm">Unknown</span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          {message.updated && (
            <span className="text-[11px] text-muted-foreground">(edited)</span>
          )}
        </div>

        {message.content && (
          <div className="text-sm leading-relaxed">
            <UnifiedMessageContent
              content={message.content}
              channelId={channelId}
              jwt={jwt}
              hasGitHubIntegration={hasGitHubIntegration}
              hasGitLabIntegration={hasGitLabIntegration}
              users={users}
              channels={channels}
              currentUserId={currentUserId}
            />
          </div>
        )}

        {attachments.length > 0 && (
          <div className={cn("flex flex-col gap-2", message.content && "mt-2")}>
            {attachments.map((attachment) =>
              isImage(attachment.file_type) ? (
                <a
                  key={attachment.id}
                  href={`/api/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block max-w-sm"
                >
                  <img
                    src={`/api/attachments/${attachment.id}`}
                    alt={attachment.filename}
                    className="max-h-72 rounded-lg border object-contain hover:opacity-90 transition-opacity"
                  />
                </a>
              ) : (
                <a
                  key={attachment.id}
                  href={`/api/attachments/${attachment.id}?download=true`}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 max-w-xs hover:bg-muted/50 transition-colors"
                >
                  <FileIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              )
            )}
          </div>
        )}

        {Object.keys(reactionCounts).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <TooltipProvider key={emoji}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                        userReactions.has(emoji)
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-muted hover:bg-muted/80 border border-transparent"
                      )}
                      onClick={() => toggleReaction(emoji)}
                    >
                      <span>{emoji}</span>
                      <span className="font-medium">{count}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{getReactionUsers(emoji)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center justify-center rounded-full w-6 h-6 bg-muted hover:bg-muted/80 transition-opacity">
                  <span className="text-xs">+</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-full p-0 border-none bg-transparent shadow-none"
                align="start"
              >
                <EmojiPicker
                  theme={Theme.AUTO}
                  onEmojiClick={(data) => toggleReaction(data.emoji)}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadComposer({
  parentId,
  channelId,
  jwt,
  users,
  channels,
}: {
  parentId: string;
  channelId: string;
  jwt: string;
  users: readonly UsersTable[];
  channels: readonly ChannelsTable[];
}) {
  const t = useTranslations("channelDetail");
  const tCommon = useTranslations("common");
  const zero = useZero();
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const { mentionState, checkForMention, closeMention, insertMention } =
    useMentionState(inputRef, message);

  const addFiles = useCallback((files: File[]) => {
    const newPendingFiles: PendingFile[] = files.map((file) => {
      const pending: PendingFile = { file };
      if (file.type.startsWith("image/")) {
        pending.preview = URL.createObjectURL(file);
      }
      return pending;
    });
    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      addFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [addFiles]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => {
      const file = prev[index];
      if (file.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const uploadFile = async (file: File): Promise<UploadedAttachment> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/attachments/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload file");
    return response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasContent = message.trim() || pendingFiles.length > 0;
    if (!hasContent) return;

    try {
      setIsUploading(true);
      const uploadedAttachments: UploadedAttachment[] = [];
      for (const pending of pendingFiles) {
        const uploaded = await uploadFile(pending.file);
        uploadedAttachments.push(uploaded);
      }

      zero.mutate.messages.insert({
        content: message.trim() || "",
        channelId,
        parentId,
        attachments:
          uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      pendingFiles.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      setMessage("");
      setPendingFiles([]);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Failed to send reply:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-primary">
            <Paperclip className="h-4 w-4" />
            <p className="text-sm font-medium">Drop to attach</p>
          </div>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pendingFiles.map((pending, index) => (
            <div key={index} className="relative group">
              {pending.preview ? (
                <img
                  src={pending.preview}
                  alt={pending.file.name}
                  className="h-16 w-16 object-cover rounded-lg border"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center">
                  <FileIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removePendingFile(index)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="text-[10px] text-muted-foreground mt-1 max-w-16 truncate">
                {pending.file.name}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={inputRef}
          type="text"
          placeholder={t("messagePlaceholderFallback")}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            requestAnimationFrame(checkForMention);
          }}
          onKeyUp={checkForMention}
          onClick={checkForMention}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoFocus
          disabled={isUploading}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isUploading || (!message.trim() && pendingFiles.length === 0)}
          className="h-8"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            tCommon("send")
          )}
        </Button>
      </div>

      {mentionState && (
        <MentionPicker
          type={mentionState.type}
          query={mentionState.query}
          users={users}
          channels={channels}
          position={mentionState.position}
          onSelect={(item) => insertMention(item, setMessage)}
          onClose={closeMention}
        />
      )}
    </form>
  );
}
