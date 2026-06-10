"use client";

import { RequireRole } from "@/components/RequireRole";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole role="WORKER">{children}</RequireRole>;
}
