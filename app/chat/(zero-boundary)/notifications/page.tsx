import { redirect } from "next/navigation";
import { auth } from "@/app/auth/auth";
import { NotificationsClient } from "./client";

export default async function NotificationsPage() {
  const session = await auth.api.getSession({
    headers: await (async () => {
      const { headers } = await import("next/headers");
      return headers();
    })(),
  });

  if (!session?.user) {
    redirect("/auth/login");
  }

  return <NotificationsClient userId={session.user.id} />;
}


