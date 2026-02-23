"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useQuery } from "@rocicorp/zero/react";
import { getAllUsers, getChannels, getUserGroups } from "./query";
import { getUserFromJwt, useJwt } from "@/app/auth/jwt";
import { ChannelComposerDialog } from "@/components/chat/channel-dialog";
import { GroupDialog } from "@/components/chat/group-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Hash,
  Lock,
  Search,
  Users,
  Plus,
  ArrowRight,
  Settings,
} from "lucide-react";
import type {
  ChannelsTable,
  GroupMember,
  GroupsTable,
  UsersTable,
} from "@/zero-schema.gen";

type ChannelListItem = ChannelsTable & {
  owner?: UsersTable;
};

type GroupWithMembers = GroupsTable & {
  owner?: UsersTable;
  members?: readonly (GroupMember & { user?: UsersTable })[];
};

export function ClientChannels() {
  const t = useTranslations("channels");
  const tCommon = useTranslations("common");
  const jwt = useJwt();
  const authToken = jwt && jwt.length > 0 ? jwt : undefined;
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"channels" | "members">(
    "channels"
  );

  // Get placeholder text safely with fallback
  const getSearchPlaceholder = () => {
    try {
      return activeTab === "channels"
        ? t("searchChannels")
        : t("searchMembers");
    } catch {
      return activeTab === "channels"
        ? "Search channels..."
        : "Search members...";
    }
  };

  const [channels] = useQuery(getChannels({ jwt: authToken ?? "" }), {
    enabled: !!authToken,
  });
  const [groups] = useQuery(getUserGroups({ jwt: authToken ?? "" }), {
    enabled: !!authToken,
  });
  const [users] = useQuery(getAllUsers({ jwt: authToken ?? "" }), {
    enabled: !!authToken,
  });

  const currentUser = useMemo(
    () => (authToken ? getUserFromJwt(authToken) : null),
    [authToken]
  );
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const allUsers = users ?? [];
  const currentUserRecord = allUsers.find((user) => user.id === currentUser?.id);
  const currentRole = currentUserRecord?.role ?? "user";
  const canManage = isE2E || currentRole === "admin" || currentRole === "owner";

  const resolvedChannels = (channels as ChannelListItem[]) ?? [];
  const resolvedGroups = (groups as GroupWithMembers[]) ?? [];

  const filteredChannels = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return resolvedChannels;
    return resolvedChannels.filter((channel) =>
      channel.name.toLowerCase().includes(q)
    );
  }, [resolvedChannels, searchTerm]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
    );
  }, [allUsers, searchTerm]);

  if (!authToken) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">{tCommon("loading")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">{t("workspace")}</h1>
          <p className="text-muted-foreground mt-1">
            {resolvedChannels.length} {t("title").toLowerCase()} ·{" "}
            {allUsers.length} {t("members").toLowerCase()}
          </p>
        </div>

        {/* Search and tabs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={getSearchPlaceholder()}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
            <Button
              variant={activeTab === "channels" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("channels")}
              className="flex-1 sm:flex-none"
            >
              <Hash className="h-4 w-4 mr-1.5" />
              {t("title")}
            </Button>
            <Button
              variant={activeTab === "members" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("members")}
              className="flex-1 sm:flex-none"
            >
              <Users className="h-4 w-4 mr-1.5" />
              {t("members")}
            </Button>
          </div>
        </div>

        {activeTab === "channels" ? (
          <>
            {/* New channel button */}
            {canManage && (
              <button
                data-testid="new-channel-button"
                onClick={() => setIsChannelDialogOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors mb-4 group"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{t("createAChannel")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("startNewConversation")}
                  </p>
                </div>
              </button>
            )}

            {/* Channel list */}
            <div className="space-y-1">
              {filteredChannels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchTerm ? t("noChannelsMatch") : t("noChannelsYet")}
                  </p>
                </div>
              ) : (
                filteredChannels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/chat/channels/${channel.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {channel.is_private ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Hash className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {channel.name}
                        </p>
                        {channel.is_private && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tCommon("private")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {t("createdBy")}{" "}
                        {channel.owner?.name ?? tCommon("unknown")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Groups section */}
            {canManage && resolvedGroups.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("groups")}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsGroupDialogOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-1.5" />
                    {t("manage")}
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {resolvedGroups.map((group) => (
                    <div
                      key={group.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <p className="font-medium text-sm">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.members?.length ?? 0}{" "}
                        {t("members").toLowerCase()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="space-y-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("noMembersMatch")}</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {user.role}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <ChannelComposerDialog
        open={isChannelDialogOpen}
        onOpenChange={setIsChannelDialogOpen}
      />
      <GroupDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
      />
    </div>
  );
}
