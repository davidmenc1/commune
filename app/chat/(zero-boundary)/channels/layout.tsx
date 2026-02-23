"use client";

import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/chat/workspace-shell";

export default function ChannelsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}

