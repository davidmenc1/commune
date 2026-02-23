"use client";

import {
  Fragment,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useTranslations } from 'next-intl';
import { getAllUsers } from "@/app/chat/(zero-boundary)/channels/query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Users } from "lucide-react";
import type { UsersTable } from "@/zero-schema.gen";
import { MultiSelectSection } from "./multi-select-section";

type GroupDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCompleted?: () => void;
  triggerDisabled?: boolean;
};

export function GroupDialog({
  trigger,
  open,
  onOpenChange,
  onCompleted,
  triggerDisabled,
}: GroupDialogProps) {
  const t = useTranslations('groups');
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
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useMemo(
    () => getUserFromJwt(authToken),
    [authToken]
  );

  const selectableUsers = useMemo(() => {
    if (!users) {
      return [];
    }
    return users.filter((user) => user.id !== currentUser.id);
  }, [users, currentUser.id]);

  const selectedMembers = useMemo(() => {
    const map = new Map((users ?? []).map((user) => [user.id, user]));
    return memberIds
      .map((id) => map.get(id))
      .filter((user): user is UsersTable => !!user);
  }, [memberIds, users]);

  useEffect(() => {
    if (!dialogOpen) {
      setName("");
      setMemberIds([]);
    }
  }, [dialogOpen]);

  const handleOpenChange = (next: boolean) => {
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const handleToggleMember = (userId: string) => {
    setMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await zero.mutate.groups.create({
        name: name.trim(),
        memberIds,
      });
      onCompleted?.();
      handleOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = !users;
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
          <DialogTitle>{t('createGroup')}</DialogTitle>
          <DialogDescription>
            {t('groupDescription')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('loadingTeammates')}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">{t('groupName')}</Label>
              <Input
                id="group-name"
                placeholder={t('groupNamePlaceholder')}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              {t('ownerInfo')}
            </div>

            <MultiSelectSection
              label={t('membersLabel')}
              description={t('membersDescription')}
              emptyState={
                selectableUsers.length === 0
                  ? t('noAdditionalUsers')
                  : t('noPeopleMatch')
              }
              options={selectableUsers.map((user) => ({
                id: user.id,
                title: user.name,
                hint: user.email,
              }))}
              selected={selectedMembers.map((user) => ({
                id: user.id,
                title: user.name,
                hint: user.email,
              }))}
              onToggle={handleToggleMember}
              icon={<Users className="h-4 w-4" />}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              t('createGroup')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


