"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { authClient } from "@/app/auth/client";
import { useJwt, getUserFromJwt, clearJwt } from "@/app/auth/jwt";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Hash, LogOut, ChevronDown, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "./language-switcher";

export function Topbar() {
  const t = useTranslations('navigation');
  const router = useRouter();
  const pathname = usePathname();
  const jwt = useJwt();
  const [hasSession, setHasSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const { data, error } = await authClient.getSession();
        if (error) {
          setHasSession(false);
        } else {
          setHasSession(!!data?.session);
        }
      } catch {
        setHasSession(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, [jwt]);

  const user = jwt ? getUserFromJwt(jwt) : null;
  const isLoggedIn = hasSession && !!user;

  const handleSignOut = async () => {
    await authClient.signOut();
    clearJwt();
    router.push("/auth/login");
    router.refresh();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const navItems = [
    { href: "/chat/channels", label: t('channels'), icon: Hash },
    { href: "/chat/notifications", label: t('notifications'), icon: Bell },
  ];

  // Minimal loading state
  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <LanguageSwitcher />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left section: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Logo />
          
          {isLoggedIn && (
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right section: Language switcher + User menu or auth buttons */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          
          {isLoggedIn ? (
            <>
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="gap-2 pl-2 pr-3 hover:bg-muted"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={undefined} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline-block">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Mobile nav items */}
                <div className="md:hidden">
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </div>
                
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">{t('signIn')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/register">{t('getStarted')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <MessageCircle className="h-4 w-4" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Commune</span>
    </Link>
  );
}
