"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROLE_HOME, useMe } from "@/lib/auth";
import { PageSpinner } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const { data: me, isError } = useMe();

  useEffect(() => {
    if (isError) router.replace("/login");
    else if (me) router.replace(ROLE_HOME[me.role]);
  }, [me, isError, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <PageSpinner />
    </main>
  );
}
