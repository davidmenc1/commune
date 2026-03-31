"use client";

import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientOnly>{children}</ClientOnly>;
}

function ClientOnly({ children }: { children: React.ReactNode }) {
  const t = useTranslations('common');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div>{t('loading')}</div>;
  }
  return <div>{children}</div>;
}
