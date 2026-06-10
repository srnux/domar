"use client";

import { RequireRole } from "@/components/RequireRole";

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole role="SUPERVISOR">{children}</RequireRole>;
}
