"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Role, Skill } from "@domar/shared";
import { useMe } from "@/lib/auth";
import { useCreateInvite, useUpdateUser, useUsers } from "@/lib/users";

export default function UsersPage() {
  const t = useTranslations("users");
  const tj = useTranslations("jobType");
  const { data: me } = useMe();
  const { data: users, isPending } = useUsers({ includeInactive: true });
  const invite = useCreateInvite();
  const updateUser = useUpdateUser();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("WORKER");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [copied, setCopied] = useState(false);

  function toggleSkill(s: Skill) {
    setSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setCopied(false);
    invite.mutate({
      email,
      role,
      skills: role === "WORKER" ? skills : undefined,
    });
  }

  const input =
    "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none focus:border-neutral-800";

  const byRole = (r: Role) => (users ?? []).filter((u) => u.role === r);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>

      <form
        onSubmit={submit}
        className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3"
      >
        <h2 className="font-semibold">{t("invite")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            className={input}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={input}
          >
            <option value="WORKER">{t("WORKER")}</option>
            <option value="OWNER">{t("OWNER")}</option>
            <option value="SUPERVISOR">{t("SUPERVISOR")}</option>
          </select>
        </div>
        {role === "WORKER" && (
          <div className="flex flex-wrap gap-2">
            {Object.values(Skill).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => toggleSkill(s)}
                className={`rounded-full px-3 py-1 text-sm ${
                  skills.includes(s)
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-300 text-neutral-600"
                }`}
              >
                {tj(s as never)}
              </button>
            ))}
          </div>
        )}
        {invite.isError && (
          <p role="alert" className="text-sm text-red-600">
            {invite.error.message}
          </p>
        )}
        {invite.data && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm">
            <span className="truncate text-green-800">
              {invite.data.inviteUrl}
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(invite.data.inviteUrl);
                setCopied(true);
              }}
              className="shrink-0 rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white"
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
        )}
        <button
          type="submit"
          disabled={invite.isPending}
          className="rounded-lg bg-neutral-900 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          {t("sendInvite")}
        </button>
      </form>

      {isPending && <p className="text-neutral-400">…</p>}
      {(["SUPERVISOR", "WORKER", "OWNER"] as const).map((r) => (
        <section key={r} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {t(r)}
          </h2>
          <div className="flex flex-col gap-2">
            {byRole(r).map((u) => (
              <div
                key={u.id}
                className={`flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 ${
                  u.isActive ? "" : "opacity-50"
                }`}
              >
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-neutral-500">
                    {u.email}
                    {u.skills.length > 0 &&
                      ` · ${u.skills.map((s) => tj(s as never)).join(", ")}`}
                  </p>
                </div>
                {u.id !== me?.id && (
                  <button
                    onClick={() =>
                      updateUser.mutate({ id: u.id, isActive: !u.isActive })
                    }
                    className="text-sm text-neutral-500 underline"
                  >
                    {u.isActive ? t("deactivate") : t("reactivate")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
