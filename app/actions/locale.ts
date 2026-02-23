'use server';

import { cookies } from 'next/headers';
import { locales } from '@/i18n/config';

function isLocale(value: string): value is (typeof locales)[number] {
  return locales.includes(value as (typeof locales)[number]);
}

export async function setLocaleCookie(locale: string) {
  // Validate locale
  if (!isLocale(locale)) {
    throw new Error('Invalid locale');
  }

  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
  });
}
