"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROLE_HOME, useMe } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { data: me, isError } = useMe();

  useEffect(() => {
    if (isError) router.replace("/login");
    else if (me) router.replace(ROLE_HOME[me.role]);
  }, [me, isError, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
    </main>
  );
}
