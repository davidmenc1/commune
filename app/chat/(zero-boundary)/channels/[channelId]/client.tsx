"use client";

import { useQuery } from "@rocicorp/zero/react";
import { useTranslations } from 'next-intl';
import { getAllUsers, getAllChannels, getChannelById, getChannelMessages } from "../query";
import { getUserFromJwt, useJwt } from "@/app/auth/jwt";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import type {
  MessagesTable,
  ReactionsTable,
  UsersTable,
  AttachmentsTable,
  ChannelWebhooksTable,
  ChannelsTable,
} from "@/zero-schema.gen";
import {
  ChannelComposerDialog,
  type ChannelForDialog,
} from "@/components/chat/channel-dialog";
import { DeleteChannelDialog } from "@/components/chat/delete-channel-dialog";
import {
  Pencil,
  Trash2,
  Smile,
  Plus,
  Paperclip,
  X,
  FileIcon,
  Download,
  Loader2,
  MoreHorizontal,
  Hash,
  Lock,
  Settings,
  ChevronLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import EmojiPicker, { Theme } from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useChannelGitHubIntegration,
  GitHubIntegrationDialog,
  GitHubUrlUnfurls,
  BuildStatusBadge,
} from "@/components/github";
import { UnifiedMessageContent } from "@/components/chat/message-content";
import { MentionPicker, useMentionState } from "@/components/chat/mention-picker";
import { UserCard } from "@/components/chat/user-card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  GitLabIntegrationDialog,
  useChannelGitLabIntegration,
  PipelineStatusBadge,
  GitLabUrlUnfurls,
} from "@/components/gitlab";
import { Github, Plug, MessageSquare } from "lucide-react";
import { WebhookDialog } from "@/components/chat/webhook-dialog";
import { ThreadPreview } from "@/components/chat/thread-preview";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { useAppZero } from "@/app/zero/use-zero";

// Custom GitLab icon component
function GitLabIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M4.845.904c-.435 0-.82.28-.955.692C2.639 5.449 1.246 9.728.07 13.335a1.437 1.437 0 00.522 1.607l11.071 8.045c.2.145.472.144.67-.004l11.073-8.04a1.436 1.436 0 00.522-1.61c-1.285-3.942-2.683-8.256-3.817-11.746a1.004 1.004 0 00-.957-.684.987.987 0 00-.949.69l-2.405 7.408H8.203l-2.41-7.408a.987.987 0 00-.942-.69h-.006z" />
    </svg>
  );
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

export function ClientChannelMessages({ channelId }: { channelId: string }) {
  const t = useTranslations('channelDetail');
  const jwt = useJwt();
  const [channel] = useQuery(getChannelById({ jwt: jwt! }, { channelId }));
  const [messages] = useQuery(getChannelMessages({ jwt: jwt! }, { channelId }));
  const [users] = useQuery(getAllUsers({ jwt: jwt! }));
  const [channels] = useQuery(getAllChannels({ jwt: jwt! }));
  const currentUser = useMemo(() => (jwt ? getUserFromJwt(jwt) : null), [jwt]);
  const currentUserRecord = useMemo(
    () => users?.find((user) => user.id === currentUser?.id),
    [users, currentUser?.id]
  );
  const currentUserRole = currentUserRecord?.role ?? "user";
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isGitHubDialogOpen, setIsGitHubDialogOpen] = useState(false);
  const [isGitLabDialogOpen, setIsGitLabDialogOpen] = useState(false);
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for GitHub integration
  const { integration: githubIntegration } = useChannelGitHubIntegration(
    channelId,
    jwt || ""
  );
  const hasGitHubIntegration = !!githubIntegration;

  // Check for GitLab integration
  const { integration: gitlabIntegration } = useChannelGitLabIntegration(
    channelId,
    jwt || ""
  );
  const hasGitLabIntegration = !!gitlabIntegration;

  // Filter to only show top-level messages (not replies)
  const topLevelMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(msg => !msg.parent_id);
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [topLevelMessages?.length]);

  if (!channel) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center space-y-3">
          <Hash className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">{t('channelNotFound')}</p>
          <Link href="/chat/channels">
            <Button variant="outline" size="sm">
              {t('backToChannels')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canManageAccess =
    !!currentUser &&
    (channel.owner_id === currentUser.id ||
      currentUserRole === "admin" ||
      currentUserRole === "owner");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3 bg-background">
        <div className="flex items-center gap-3">
          <Link href="/chat/channels" className="lg:hidden">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              {channel.is_private ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Hash className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="font-semibold leading-none">{channel.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {topLevelMessages?.length || 0} messages
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasGitHubIntegration && (
            <BuildStatusBadge channelId={channelId} jwt={jwt || ""} />
          )}
          {hasGitLabIntegration && (
            <PipelineStatusBadge channelId={channelId} jwt={jwt || ""} />
          )}
          {canManageAccess && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit channel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsGitHubDialogOpen(true)}>
                  <Github className="h-4 w-4 mr-2" />
                  GitHub integration
                  {hasGitHubIntegration && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Connected
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsGitLabDialogOpen(true)}>
                  <GitLabIcon className="h-4 w-4 mr-2" />
                  GitLab integration
                  {hasGitLabIntegration && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Connected
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsWebhookDialogOpen(true)}>
                  <Plug className="h-4 w-4 mr-2" />
                  Webhooks
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete channel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
          {topLevelMessages && topLevelMessages.length > 0 ? (
            topLevelMessages.map((message, index) => {
              const prevMessage = index > 0 ? topLevelMessages[index - 1] : null;
              const isWebhook = !!message.webhook_id;
              const prevIsWebhook = prevMessage
                ? !!prevMessage.webhook_id
                : false;

              const showAvatar =
                !prevMessage ||
                prevMessage.author_id !== message.author_id ||
                isWebhook !== prevIsWebhook || // Don't group webhook and non-webhook messages
                (isWebhook && prevMessage.webhook_id !== message.webhook_id) || // Don't group different webhooks
                new Date(message.created_at).getTime() -
                  new Date(prevMessage.created_at).getTime() >
                  5 * 60 * 1000;
              const showDate =
                index === 0 ||
                new Date(message.created_at).toDateString() !==
                  new Date(topLevelMessages[index - 1].created_at).toDateString();

              return (
                <div key={message.id}>
                  <MessageRow
                    message={message}
                    isSelf={currentUser?.id === message.author_id}
                    currentUserId={currentUser?.id}
                    users={users || []}
                    channels={channels || []}
                    showAvatar={showAvatar}
                    showDate={showDate}
                    channelId={channelId}
                    jwt={jwt || ""}
                    hasGitHubIntegration={hasGitHubIntegration}
                    hasGitLabIntegration={hasGitLabIntegration}
                    onOpenThread={() => setOpenThreadId(message.id)}
                  />
                  <ThreadPreview
                    parentMessage={message}
                    users={users || []}
                    onOpenThread={() => setOpenThreadId(message.id)}
                  />
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Hash className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">
                Welcome to #{channel.name}
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                This is the beginning of the channel. Say something to get the
                conversation started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <MessageComposer 
            channelId={channelId} 
            channelName={channel.name}
            users={users || []}
            channels={channels || []}
          />
        </div>
      </div>

      {/* Dialogs */}
      {canManageAccess && channel && (
        <ChannelComposerDialog
          mode="edit"
          channel={channel as ChannelForDialog}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}
      {canManageAccess && (
        <DeleteChannelDialog
          channelId={channel.id}
          channelName={channel.name}
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        />
      )}
      {canManageAccess && (
        <GitHubIntegrationDialog
          channelId={channel.id}
          channelName={channel.name}
          jwt={jwt || ""}
          open={isGitHubDialogOpen}
          onOpenChange={setIsGitHubDialogOpen}
        />
      )}
      {canManageAccess && (
        <GitLabIntegrationDialog
          channelId={channel.id}
          channelName={channel.name}
          jwt={jwt || ""}
          open={isGitLabDialogOpen}
          onOpenChange={setIsGitLabDialogOpen}
        />
      )}
      {canManageAccess && (
        <WebhookDialog
          channelId={channel.id}
          jwt={jwt || ""}
          open={isWebhookDialogOpen}
          onOpenChange={setIsWebhookDialogOpen}
        />
      )}

      {/* Thread Panel */}
      {openThreadId && (
        <ThreadPanel
          parentMessageId={openThreadId}
          channelId={channelId}
          currentUserId={currentUser?.id}
          jwt={jwt || ""}
          onClose={() => setOpenThreadId(null)}
          hasGitHubIntegration={hasGitHubIntegration}
          hasGitLabIntegration={hasGitLabIntegration}
        />
      )}
    </div>
  );
}

function MessageRow({
  message,
  showDate,
  showAvatar,
  isSelf,
  currentUserId,
  users,
  channels,
  channelId,
  jwt,
  hasGitHubIntegration,
  hasGitLabIntegration,
  onOpenThread,
}: {
  message: MessagesTable & {
    reactions?: readonly ReactionsTable[];
    attachments?: readonly AttachmentsTable[];
    webhook?: ChannelWebhooksTable | null;
  };
  showDate: boolean;
  showAvatar: boolean;
  isSelf?: boolean;
  currentUserId?: string;
  users: readonly UsersTable[];
  channels: readonly ChannelsTable[];
  channelId: string;
  jwt: string;
  hasGitHubIntegration: boolean;
  hasGitLabIntegration: boolean;
  onOpenThread?: () => void;
}) {
  const t = useTranslations('channelDetail');
  const tCommon = useTranslations('common');
  const zero = useAppZero();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const author = users.find((u) => u.id === message.author_id);
  const isWebhookMessage = !!message.webhook;
  const displayName = isWebhookMessage
    ? message.webhook!.name
    : (author?.name ?? "Unknown");
  const authorName = author?.name ?? "Unknown";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate consistent color from name
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

  const reactions = message.reactions || [];
  const attachments = message.attachments || [];
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

  const handleStartEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    if (trimmedContent && trimmedContent !== message.content) {
      zero.mutate.messages.update({
        messageId: message.id,
        content: trimmedContent,
      });
    }
    setIsEditing(false);
  };

  const handleDeleteMessage = () => {
    zero.mutate.messages.delete({ messageId: message.id });
    setShowDeleteConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <>
      {showDate && (
        <div className="flex items-center gap-3 py-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground px-2">
            {new Date(message.created_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      <div
        className={cn(
          "group relative flex gap-3 rounded-lg px-2 py-1 -mx-2 transition-colors",
          isHovered && "bg-muted/50"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar or spacer */}
        <div className="w-9 shrink-0">
          {showAvatar && (
            isWebhookMessage || !author ? (
              <Avatar className="h-9 w-9">
                <AvatarFallback
                  className={cn(
                    "text-xs font-medium",
                    isWebhookMessage
                      ? "bg-blue-500/10 text-blue-600"
                      : getAvatarColor(displayName)
                  )}
                >
                  {isWebhookMessage ? (
                    <Plug className="h-4 w-4" />
                  ) : (
                    getInitials(displayName)
                  )}
                </AvatarFallback>
              </Avatar>
            ) : (
              <HoverCard openDelay={300} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button className="cursor-pointer">
                    <Avatar className="h-9 w-9 transition-transform hover:scale-105">
                      <AvatarFallback
                        className={cn(
                          "text-xs font-medium",
                          getAvatarColor(displayName)
                        )}
                      >
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent
                  className="w-auto p-0"
                  side="right"
                  align="start"
                  sideOffset={8}
                >
                  <UserCard user={author} />
                </HoverCardContent>
              </HoverCard>
            )
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {showAvatar && (
            <div className="flex items-baseline gap-2 mb-0.5">
              {isWebhookMessage || !author ? (
                <span className="font-semibold text-sm">{displayName}</span>
              ) : (
                <HoverCard openDelay={300} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <button className="font-semibold text-sm hover:underline cursor-pointer">
                      {displayName}
                    </button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-auto p-0"
                    side="top"
                    align="start"
                    sideOffset={5}
                  >
                    <UserCard user={author} />
                  </HoverCardContent>
                </HoverCard>
              )}
              {isWebhookMessage && (
                <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-inset ring-blue-500/20">
                  Webhook
                </span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {new Date(message.created_at).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {message.updated && (
                <span className="text-[11px] text-muted-foreground">
                  (edited)
                </span>
              )}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[80px] bg-background border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Edit your message..."
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Escape to cancel • Enter to save
                </span>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-7"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim()}
                    className="h-7"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
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

              {/* GitHub URL unfurls */}
              {message.content && (
                <GitHubUrlUnfurls
                  content={message.content}
                  channelId={channelId}
                  jwt={jwt}
                  hasIntegration={hasGitHubIntegration}
                />
              )}

              {/* GitLab URL unfurls */}
              {message.content && (
                <GitLabUrlUnfurls
                  content={message.content}
                  channelId={channelId}
                  jwt={jwt}
                  hasIntegration={hasGitLabIntegration}
                />
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div
                  className={cn(
                    "flex flex-col gap-2",
                    message.content && "mt-2"
                  )}
                >
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

              {/* Reactions */}
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
                      <button className="inline-flex items-center justify-center rounded-full w-6 h-6 bg-muted hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-3 w-3 text-muted-foreground" />
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
            </>
          )}
        </div>

        {/* Action toolbar */}
        {!isEditing && (isHovered || isMenuOpen) && (
          <div className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg border bg-background shadow-sm p-0.5">
            {onOpenThread && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onOpenThread}
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">{t('reply')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-full p-0 border-none bg-transparent shadow-none"
                align="end"
              >
                <EmojiPicker
                  theme={Theme.AUTO}
                  onEmojiClick={(data) => toggleReaction(data.emoji)}
                />
              </PopoverContent>
            </Popover>

            {isSelf && !isWebhookMessage && (
              <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleStartEdit}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {tCommon('edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {tCommon('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteMessageTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteMessageWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MessageComposer({
  channelId,
  channelName,
  users,
  channels,
}: {
  channelId: string;
  channelName?: string;
  users: readonly UsersTable[];
  channels: readonly ChannelsTable[];
}) {
  const t = useTranslations('channelDetail');
  const tCommon = useTranslations('common');
  const jwt = useJwt();
  const zero = useAppZero();
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLFormElement>(null);
  const dragCounterRef = useRef(0);
  
  // Mention picker state
  const { mentionState, checkForMention, closeMention, insertMention } = useMentionState(inputRef, message);

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
      console.error("Failed to send message:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form
      ref={dropZoneRef}
      onSubmit={handleSubmit}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-primary">
            <Paperclip className="h-4 w-4" />
            <p className="text-sm font-medium">Drop to attach</p>
          </div>
        </div>
      )}

      {/* Pending files */}
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

      {/* Input */}
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
          placeholder={channelName ? t('messagePlaceholder', { channel: channelName }) : t('messagePlaceholderFallback')}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            // Check for mentions after state update
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
          disabled={
            isUploading || (!message.trim() && pendingFiles.length === 0)
          }
          className="h-8"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : tCommon('send')}
        </Button>
      </div>

      {/* Mention Picker */}
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
