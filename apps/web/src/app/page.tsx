"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor, useMe } from "@/lib/auth";
import { PageSpinner } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const { data: me, isError } = useMe();

  useEffect(() => {
    if (isError) router.replace("/login");
    else if (me) router.replace(homeFor(me));
  }, [me, isError, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <PageSpinner />
    </main>
  );
}
