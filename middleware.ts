import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from './i18n/config';

export function middleware(request: NextRequest) {
  // Get locale from cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  
  // Validate and use locale, fallback to default
  const locale = cookieLocale && locales.includes(cookieLocale as any)
    ? cookieLocale
    : defaultLocale;

  // Create response
  const response = NextResponse.next();

  // Set the cookie if it doesn't exist or is invalid
  if (!cookieLocale || !locales.includes(cookieLocale as any)) {
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: '/',
    });
  }

  // Add locale to headers for server components
  response.headers.set('x-locale', locale);

  return response;
}

export const config = {
  // Match all paths except static files and API routes that don't need i18n
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
