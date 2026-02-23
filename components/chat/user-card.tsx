"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Shield, Crown, User } from "lucide-react";
import type { UsersTable } from "@/zero-schema.gen";
import { cn } from "@/lib/utils";

interface UserCardProps {
  user: UsersTable;
  className?: string;
}

export function UserCard({ user, className }: UserCardProps) {
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
      "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      "bg-orange-500/15 text-orange-600 dark:text-orange-400",
      "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      "bg-teal-500/15 text-teal-600 dark:text-teal-400",
      "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
      "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
      "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      "bg-pink-500/15 text-pink-600 dark:text-pink-400",
    ];
    const index =
      name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  const getRoleBadge = () => {
    const role = user.role || "user";
    switch (role) {
      case "owner":
        return (
          <Badge 
            variant="outline" 
            className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          >
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge 
            variant="outline" 
            className="gap-1 border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400"
          >
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge 
            variant="outline" 
            className="gap-1 border-muted-foreground/30 bg-muted text-muted-foreground"
          >
            <User className="h-3 w-3" />
            Member
          </Badge>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={cn("w-72 p-4", className)}>
      {/* Header with avatar and name */}
      <div className="flex items-start gap-3">
        <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg">
          {user.image && <AvatarImage src={user.image} alt={user.name} />}
          <AvatarFallback
            className={cn(
              "text-base font-semibold",
              getAvatarColor(user.name)
            )}
          >
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="font-semibold text-base truncate">{user.name}</h3>
          <div className="mt-1">{getRoleBadge()}</div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border my-3" />

      {/* Details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Joined {formatDate(user.created_at)}</span>
        </div>
      </div>
    </div>
  );
}



