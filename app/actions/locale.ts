'use server';

import { cookies } from 'next/headers';
import { locales } from '@/i18n/config';

export async function setLocaleCookie(locale: string) {
  // Validate locale
  if (!locales.includes(locale as any)) {
    throw new Error('Invalid locale');
  }

  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
  });
}
