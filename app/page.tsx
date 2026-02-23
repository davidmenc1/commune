"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import { useJwt } from "./auth/jwt";
import { Button } from "@/components/ui/button";
import { Hash, MessageCircle, ArrowRight } from "lucide-react";

export default function Home() {
  const t = useTranslations();
  const jwt = useJwt();
  const router = useRouter();
  const isLoggedIn = jwt && jwt.length > 0;

  // Auto-redirect logged in users to channels
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/chat/channels");
    }
  }, [isLoggedIn, router]);

  // Show loading while checking auth or redirecting
  if (isLoggedIn) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">{t('common.loadingWorkspace')}</span>
        </div>
      </div>
    );
  }

  // Not logged in - show simple entry point
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-2xl font-semibold mb-2">{t('landing.welcome')}</h1>
        <p className="text-muted-foreground mb-8">
          {t('landing.signInPrompt')}
        </p>

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link href="/auth/login">
              {t('landing.signIn')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link href="/auth/register">
              {t('landing.createAccount')}
            </Link>
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t">
          <p className="text-xs text-muted-foreground">
            {t('landing.footerText')}
          </p>
        </div>
      </div>
    </div>
  );
}
