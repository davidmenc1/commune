"use client";

import { ZeroProvider, useSuspenseQuery } from "@rocicorp/zero/react";
import { useTranslations } from "next-intl";
import { schema } from "@/app/zero/schema";
import { createMutators } from "@/app/zero/mutators";
import { clearJwt, getJwt, getUserFromJwt, useJwt } from "@/app/auth/jwt";
import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/app/auth/client";
import { decodeJwt } from "jose";
import { NotificationDropdown } from "@/components/chat/notification-dropdown";
import { usePathname, useRouter } from "next/navigation";
import { isUserInZero } from "./traffic/query";

function isJwtExpired(token: string): boolean {
  try {
    const { exp } = decodeJwt(token);
    if (!exp) return true;
    // Add 30 second buffer to refresh before actual expiration
    return exp < Date.now() / 1000 + 30;
  } catch {
    return true;
  }
}

export default function TrafficLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const jwt = useJwt();
  const router = useRouter();
  const [isResolvingJwt, setIsResolvingJwt] = useState(true);

  const zeroServerUrl = useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_ZERO_SERVER_URL?.trim();
    if (configured) {
      return configured;
    }

    if (typeof window !== "undefined") {
      return `https://commune-zero.vladanmatejka.top`;
    }

    return "http://localhost:4848";
  }, []);

  const zeroQueryUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/zero/get-queries`;
    }

    return "http://localhost:3000/api/zero/get-queries";
  }, []);

  const needsRefresh = useMemo(() => {
    if (!jwt) return true;
    return isJwtExpired(jwt);
  }, [jwt]);

  useEffect(() => {
    let cancelled = false;

    async function refreshJwtFromSession() {
      try {
        const { data, error } = await authClient.getSession();
        const sessionToken = data?.session?.token;
        if (error || !sessionToken) {
          clearJwt();
          if (!cancelled) {
            router.push("/auth/login");
          }
          return;
        }

        await getJwt(sessionToken);
      } catch {
        clearJwt();
        if (!cancelled) {
          router.push("/auth/login");
        }
      } finally {
        if (!cancelled) {
          setIsResolvingJwt(false);
        }
      }
    }

    if (!needsRefresh) {
      setIsResolvingJwt(false);
      return;
    }

    setIsResolvingJwt(true);

    // Clear any expired token first
    if (jwt && isJwtExpired(jwt)) {
      clearJwt();
    }

    void refreshJwtFromSession();

    return () => {
      cancelled = true;
    };
  }, [jwt, needsRefresh, router]);

  if (isResolvingJwt || !jwt) {
    return <div>{t("loading")}</div>;
  }

  const { id } = getUserFromJwt(jwt);

  return (
    <div className="relative">
      <ZeroProvider
        {...{
          userID: id,
          auth: jwt,
          server: zeroServerUrl,
          schema,
          mutators: createMutators({ jwt }),
          query: {
            url: zeroQueryUrl,
          },
        }}
      >
        <AccessControlWrapper jwt={jwt}>
          {/* Position notification dropdown to align with topbar */}
          <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-end px-4 sm:px-6">
              <div className="pointer-events-auto mr-3">
                <NotificationDropdown userId={id} />
              </div>
              {/* Spacer to account for user menu width */}
              <div className="w-[120px]" />
            </div>
          </div>
          {children}
        </AccessControlWrapper>
      </ZeroProvider>
    </div>
  );
}

function AccessControlWrapper({
  children,
  jwt,
}: {
  children: React.ReactNode;
  jwt: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const [zeroUser] = useSuspenseQuery(isUserInZero({ jwt }), {
    suspendUntil: "complete",
    enabled: !isE2E,
  });
  const user = useMemo(
    () => (isE2E ? { id: "e2e-user" } : zeroUser),
    [isE2E, zeroUser],
  );

  useEffect(() => {
    // If user doesn't exist in Zero and they're not on the traffic page, redirect them
    if (user === undefined && pathname !== "/chat/traffic") {
      router.push("/chat/traffic");
    }
  }, [user, pathname, router]);

  // Show loading while checking or redirecting
  if (user === undefined && pathname !== "/chat/traffic") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">Redirecting...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
