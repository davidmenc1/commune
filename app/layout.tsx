import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { JwtProvider } from "./auth/jwt_client";
import { Topbar } from "@/components/topbar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Commune - Thoughtful Team Chat",
  description:
    "A calm, focused space for team communication. Real-time messaging with channels, groups, and file sharing.",
  keywords: ["chat", "team", "messaging", "collaboration", "channels"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased font-sans">
        <Providers messages={messages} locale={locale}>
          <JwtProvider>
            <Topbar />
            {children}
          </JwtProvider>
        </Providers>
      </body>
    </html>
  );
}
