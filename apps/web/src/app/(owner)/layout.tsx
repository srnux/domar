"use client";

import { RequireRole } from "@/components/RequireRole";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireRole role="OWNER">{children}</RequireRole>;
}
