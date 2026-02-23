"use client";

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
  messages: any;
  locale: string;
}

export function Providers({ children, messages, locale }: ProvidersProps) {
  return (
    <NextIntlClientProvider 
      messages={messages}
      locale={locale}
      onError={(error) => {
        // Suppress errors during hydration to prevent crashes
        if (error.code === 'MISSING_MESSAGE') {
          // Only log in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('Missing translation:', error.message);
          }
        }
      }}
      getMessageFallback={({ namespace, key }) => {
        // Provide a reasonable fallback during hydration
        // Convert camelCase to readable text
        const readable = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        return readable.charAt(0).toUpperCase() + readable.slice(1);
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
