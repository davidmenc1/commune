"use client";

import { useSuspenseQuery, useZero } from "@rocicorp/zero/react";
import { useTranslations } from 'next-intl';
import { isUserInZero, hasAnyUsers } from "./query";
import { useJwt } from "@/app/auth/jwt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ClientTraffic() {
  const t = useTranslations('traffic');
  const jwt = useJwt();
  const router = useRouter();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const [zeroUser] = useSuspenseQuery(isUserInZero({ jwt: jwt! }), {
    suspendUntil: "complete",
    enabled: !isE2E,
  });
  const [zeroAnyUsers] = useSuspenseQuery(hasAnyUsers({ jwt: jwt! }), {
    suspendUntil: "complete",
    enabled: !isE2E,
  });
  const user = isE2E ? undefined : zeroUser;
  const anyUsers = isE2E ? [] : zeroAnyUsers;

  // Redirect users who are already set up
  useEffect(() => {
    if (user !== undefined) {
      router.push("/chat/channels");
    }
  }, [user, router]);

  if (user === undefined) {
    const needsAccessCode = !anyUsers || anyUsers.length === 0;
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('welcome')}</CardTitle>
            <CardDescription>
              {t('completeSetup')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserSignupForm needsAccessCode={needsAccessCode} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while redirecting
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">{t('redirecting') || 'Redirecting...'}</span>
      </div>
    </div>
  );
}

const UserSignupForm = ({ needsAccessCode }: { needsAccessCode: boolean }) => {
  const t = useTranslations('traffic');
  const zero = useZero();
  const [setupCode, setSetupCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    zero.mutate.user.insert({ setupCode: needsAccessCode ? setupCode : "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {needsAccessCode && (
        <div className="space-y-2">
          <label htmlFor="setupCode" className="text-sm font-medium">
            {t('setupCode')}
          </label>
          <Input
            id="setupCode"
            placeholder={t('enterSetupCode')}
            value={setupCode}
            onChange={(e) => setSetupCode(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {t('setupCodeDescription')}
          </p>
        </div>
      )}
      <Button type="submit" className="w-full">
        {t('completeSetupButton')}
      </Button>
    </form>
  );
};
