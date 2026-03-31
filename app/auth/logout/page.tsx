"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { authClient } from "../client";
import { clearJwt } from "../jwt";

export default function Logout() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasTriggeredRef = useRef(false);

  const onSignOut = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await authClient.signOut();
      if (error) {
        setError(error.message ?? "Something went wrong");
      }
    } finally {
      clearJwt();
      router.replace("/auth/login");
      router.refresh();
      setIsSubmitting(false);
    }
  }, [router]);

  useEffect(() => {
    if (hasTriggeredRef.current) {
      return;
    }
    hasTriggeredRef.current = true;
    void onSignOut();
  }, [onSignOut]);

  return (
    <div className="max-w-md pt-10 mx-auto">
      <Card className="py-8 px-6">
        <CardHeader>Logout</CardHeader>
        <div className="space-y-6">
          {error && <p className="text-red-500">{error}</p>}
          <Button type="button" onClick={onSignOut} disabled={isSubmitting}>
            {isSubmitting ? "Signing out..." : "Sign out again"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
