"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@rocicorp/zero/react";
import { getChannels, getAllUsers } from "@/app/chat/(zero-boundary)/channels/query";
import { getUserFromJwt, useJwt } from "@/app/auth/jwt";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Hash, Lock, Plus, Search, MessageCircle, ChevronDown, LogOut } from "lucide-react";
import type { ChannelsTable, UsersTable } from "@/zero-schema.gen";
import { ChannelComposerDialog } from "./channel-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/app/auth/client";

type ChannelListItem = ChannelsTable & {
  owner?: UsersTable;
};

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const tChannels = useTranslations('channels');
  const jwt = useJwt();
  const authToken = jwt && jwt.length > 0 ? jwt : undefined;
  const [channels] = useQuery(getChannels({ jwt: authToken ?? "" }), {
    enabled: !!authToken,
  });
  const [users] = useQuery(getAllUsers({ jwt: authToken ?? "" }), {
    enabled: !!authToken,
  });
  const pathname = usePathname();
  const router = useRouter();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentUser = useMemo(
    () => (authToken ? getUserFromJwt(authToken) : null),
    [authToken]
  );
  
  const currentUserRecord = useMemo(() => {
    if (!currentUser || !users) return undefined;
    return users.find((user) => user.id === currentUser.id);
  }, [currentUser, users]);

  const currentRole = currentUserRecord?.role ?? "user";
  const canManageChannels = currentRole === "admin" || currentRole === "owner";

  const channelItems = (channels as ChannelListItem[]) ?? [];
  const activeChannelId = pathname?.startsWith("/chat/channels/")
    ? pathname.split("/chat/channels/")[1]
    : null;

  const handleChannelNavigate = (channelId: string) => {
    setIsCommandOpen(false);
    router.push(`/chat/channels/${channelId}`);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!authToken) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Command palette */}
      <CommandDialog
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        title="Search channels"
        description="Quickly jump to any channel"
      >
        <CommandInput placeholder="Search channels..." />
        <CommandList>
          <CommandEmpty>No channels found.</CommandEmpty>
          <CommandGroup>
            {channelItems.map((channel) => (
              <CommandItem
                key={channel.id}
                value={channel.name}
                onSelect={() => handleChannelNavigate(channel.id)}
                className="flex items-center gap-2"
              >
                {channel.is_private ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Hash className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{channel.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <ChannelComposerDialog
        mode="create"
        open={isChannelDialogOpen}
        onOpenChange={setIsChannelDialogOpen}
        triggerDisabled={!canManageChannels}
      />

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-muted/20 lg:flex">
          {/* Workspace header */}
          <div className="p-3 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors text-left">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">Commune</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser?.name}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="p-3">
            <button
              onClick={() => setIsCommandOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">{t('search')}</span>
              <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>
          </div>

          {/* Channels */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {tChannels('sidebarHeader')}
              </span>
              {canManageChannels && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setIsChannelDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <nav className="space-y-0.5">
              {channelItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No channels yet
                </p>
              ) : (
                channelItems.map((channel) => {
                  const isActive = activeChannelId === channel.id;
                  return (
                    <Link
                      key={channel.id}
                      href={`/chat/channels/${channel.id}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {channel.is_private ? (
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Hash className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{channel.name}</span>
                    </Link>
                  );
                })
              )}
            </nav>
          </div>

          {/* User */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {currentUser?.name ? getInitials(currentUser.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{currentRole}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-background">
          {children}
        </main>
      </div>
    </>
  );
}
