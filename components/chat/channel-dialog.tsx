"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useTranslations } from 'next-intl';
import {
  getAllUsers,
  getUserGroups,
} from "@/app/chat/(zero-boundary)/channels/query";
import { getUserFromJwt, useJwt } from "@/app/auth/jwt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Users, UserRoundPlus } from "lucide-react";
import type {
  ChannelGroupAccess,
  ChannelUserAccess,
  ChannelsTable,
  GroupMember,
  GroupsTable,
  UsersTable,
} from "@/zero-schema.gen";
import { MultiSelectSection } from "./multi-select-section";

type ChannelUserAccessWithUser = ChannelUserAccess & {
  user?: UsersTable;
};

type ChannelGroupAccessWithGroup = ChannelGroupAccess & {
  group?: GroupsTable & {
    owner?: UsersTable;
  };
};

export type ChannelForDialog = ChannelsTable & {
  owner?: UsersTable;
  userAccess?: readonly ChannelUserAccessWithUser[];
  groupAccess?: readonly ChannelGroupAccessWithGroup[];
};

type GroupWithMembers = GroupsTable & {
  owner?: UsersTable;
  members?: readonly (GroupMember & { user?: UsersTable })[];
};

type ChannelComposerDialogProps = {
  channel?: ChannelForDialog;
  mode?: "create" | "edit";
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCompleted?: () => void;
  triggerDisabled?: boolean;
};

export function ChannelComposerDialog({
  channel,
  mode = channel ? "edit" : "create",
  trigger,
  open,
  onOpenChange,
  onCompleted,
  triggerDisabled,
}: ChannelComposerDialogProps) {
  const t = useTranslations('channels');
  const tCommon = useTranslations('common');
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open ?? internalOpen;
  const zero = useZero();
  const jwt = useJwt();
  const authToken = jwt && jwt.length > 0 ? jwt : undefined;

  if (!authToken) {
    return trigger ? <Fragment>{trigger}</Fragment> : null;
  }

  const [users] = useQuery(getAllUsers({ jwt: authToken }));
  const [groups] = useQuery(getUserGroups({ jwt: authToken }));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useMemo(
    () => (authToken ? getUserFromJwt(authToken) : null),
    [authToken]
  );

  const currentUserRecord = useMemo(() => {
    if (!users || !currentUser) {
      return undefined;
    }
    return users.find((user) => user.id === currentUser.id);
  }, [users, currentUser]);

  const selectableUsers = useMemo(() => {
    if (!users || !currentUser) {
      return [];
    }
    return users.filter((user) => user.id !== currentUser.id);
  }, [users, currentUser]);

  const normalizedGroups = (groups as GroupWithMembers[]) ?? [];

  const initialUserIds = useMemo(() => {
    if (!channel?.userAccess) {
      return [] as string[];
    }
    return channel.userAccess
      .filter((access) => access.user_id !== channel.owner_id)
      .map((access) => access.user_id);
  }, [channel]);

  const initialGroupIds = useMemo(() => {
    if (!channel?.groupAccess) {
      return [] as string[];
    }
    return channel.groupAccess.map((access) => access.group_id);
  }, [channel]);

  const [name, setName] = useState(channel?.name ?? "");
  const [isPrivate, setIsPrivate] = useState(channel?.is_private ?? false);
  const [selectedUserIds, setSelectedUserIds] =
    useState<string[]>(initialUserIds);
  const [selectedGroupIds, setSelectedGroupIds] =
    useState<string[]>(initialGroupIds);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }
    setName(channel?.name ?? "");
    setIsPrivate(channel?.is_private ?? false);
    setSelectedUserIds(initialUserIds);
    setSelectedGroupIds(initialGroupIds);
  }, [dialogOpen, channel, initialUserIds, initialGroupIds]);

  const isEditing = mode === "edit" && !!channel;
  const dialogTitle = isEditing ? t('editChannel') : t('createChannel');
  const dialogDescription = isEditing
    ? t('channelDescriptionPlaceholder')
    : t('channelDescriptionPlaceholder');

  const selectedUsers = useMemo(() => {
    const map = new Map((users ?? []).map((user) => [user.id, user]));
    return selectedUserIds
      .map((id) => map.get(id))
      .filter((user): user is UsersTable => !!user);
  }, [selectedUserIds, users]);

  const selectedGroupRecords = useMemo(() => {
    const map = new Map(normalizedGroups.map((group) => [group.id, group]));
    return selectedGroupIds
      .map((id) => map.get(id))
      .filter((group): group is GroupWithMembers => !!group);
  }, [selectedGroupIds, normalizedGroups]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const resetAndClose = () => {
    setIsSubmitting(false);
    onCompleted?.();
    handleOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        isPrivate,
        userIds: isPrivate ? selectedUserIds : [],
        groupIds: isPrivate ? selectedGroupIds : [],
      };

      if (isEditing) {
        await zero.mutate.channels.update({
          channelId: channel!.id,
          ...payload,
        });
      } else {
        await zero.mutate.channels.create(payload);
      }
      resetAndClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = !users || !currentUser;
  const canSubmit = !!name.trim() && !isSubmitting && !isLoading;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild disabled={triggerDisabled}>
          <Fragment>{trigger}</Fragment>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {tCommon('loading')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">{t('channelName')}</Label>
              <Input
                id="channel-name"
                placeholder="general, product-planning…"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{tCommon('private')} {t('title').toLowerCase()}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('privateChannelDescription')}
                  </p>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={(checked) => {
                    setIsPrivate(checked);
                    if (!checked) {
                      setSelectedUserIds([]);
                      setSelectedGroupIds([]);
                    }
                  }}
                />
              </div>
            </div>

            {isPrivate ? (
              <div className="space-y-6">
                <MultiSelectSection
                  label={t('addUsers')}
                  description={t('usersWithAccess')}
                  emptyState={t('noUsers')}
                  options={selectableUsers.map((user) => ({
                    id: user.id,
                    title: user.name,
                    hint: user.email,
                  }))}
                  selected={selectedUsers.map((user) => ({
                    id: user.id,
                    title: user.name,
                    hint: user.email,
                  }))}
                  onToggle={handleToggleUser}
                />

                <MultiSelectSection
                  label={t('addGroups')}
                  description={t('groupsWithAccess')}
                  emptyState={
                    normalizedGroups.length === 0
                      ? t('noGroups')
                      : t('noGroups')
                  }
                  options={normalizedGroups.map((group) => ({
                    id: group.id,
                    title: group.name,
                    hint: `${group.members?.length ?? 0} ${tCommon('members').toLowerCase()}`,
                  }))}
                  selected={selectedGroupRecords.map((group) => ({
                    id: group.id,
                    title: group.name,
                    hint: `${group.members?.length ?? 0} ${tCommon('members').toLowerCase()}`,
                  }))}
                  onToggle={handleToggleGroup}
                  icon={<Users className="h-4 w-4" />}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">
                  {tCommon('public')} {t('title').toLowerCase()}
                </p>
                <p>
                  {t('privateChannelDescription')}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => handleOpenChange(false)}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? t('updating') : t('creating')}
              </>
            ) : isEditing ? (
              tCommon('save')
            ) : (
              <>
                <UserRoundPlus className="mr-2 h-4 w-4" />
                {t('createChannel')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}