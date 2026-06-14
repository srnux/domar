"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Role, Skill } from "@domar/shared";
import { Check, Copy, Mail } from "lucide-react";
import { StarDisplay } from "@/components/StarRating";
import { useMe } from "@/lib/auth";
import { useCreateInvite, useUpdateUser, useUsers } from "@/lib/users";
import {
  Button,
  Card,
  Input,
  PageHeader,
  PageSpinner,
  Select,
  UserAvatar,
} from "@/components/ui";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSkills, setDraftSkills] = useState<Skill[]>([]);

  function toggleSkill(s: Skill) {
    setSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleDraftSkill(s: Skill) {
    setDraftSkills((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function renderSkillPills(selected: Skill[], onToggle: (s: Skill) => void) {
    return (
      <div className="flex flex-wrap gap-2">
        {Object.values(Skill).map((s) => {
          const on = selected.includes(s);
          return (
            <button
              type="button"
              key={s}
              onClick={() => onToggle(s)}
              aria-pressed={on}
              className={`inline-flex items-center gap-1 rounded-pill px-3 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? "bg-accent text-white"
                  : "border border-border-strong text-fg-soft hover:bg-surface-2"
              }`}
            >
              {on && <Check size={13} aria-hidden />}
              {tj(s as never)}
            </button>
          );
        })}
      </div>
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

  const byRole = (r: Role) => (users ?? []).filter((u) => u.role === r);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <PageHeader title={t("title")} />

      <Card className="mb-6 p-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <h2 className="font-semibold text-fg">{t("invite")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email")}
            />
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="WORKER">{t("WORKER")}</option>
              <option value="OWNER">{t("OWNER")}</option>
              <option value="SUPERVISOR">{t("SUPERVISOR")}</option>
            </Select>
          </div>
          {role === "WORKER" && renderSkillPills(skills, toggleSkill)}
          {invite.isError && (
            <p role="alert" className="text-sm text-st-declined">
              {invite.error.message}
            </p>
          )}
          {invite.data && (
            <div className="flex items-center gap-2 rounded-md border border-accent-line bg-accent-soft p-2.5 text-sm">
              <span className="truncate font-mono text-accent-fg">
                {invite.data.inviteUrl}
              </span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="ml-auto shrink-0"
                onClick={() => {
                  void navigator.clipboard.writeText(invite.data.inviteUrl);
                  setCopied(true);
                }}
              >
                {copied ? (
                  <Check size={13} aria-hidden />
                ) : (
                  <Copy size={13} aria-hidden />
                )}
                {copied ? t("copied") : t("copy")}
              </Button>
            </div>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={invite.isPending}
            loading={invite.isPending}
          >
            <Mail size={16} aria-hidden /> {t("sendInvite")}
          </Button>
        </form>
      </Card>

      {isPending && <PageSpinner />}
      {(["SUPERVISOR", "WORKER", "OWNER"] as const).map((r) => (
        <section key={r} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t(r)}
          </h2>
          <div className="flex flex-col gap-2">
            {byRole(r).map((u) => (
              <Card
                key={u.id}
                className={`flex flex-col gap-3 p-3.5 ${
                  u.isActive ? "" : "opacity-55"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <UserAvatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg">{u.name}</p>
                    <p className="truncate text-sm text-muted">
                      {u.email}
                      {u.skills.length > 0 &&
                        ` · ${u.skills.map((s) => tj(s as never)).join(", ")}`}
                    </p>
                    {r === "WORKER" &&
                      (u.ratingCount > 0 ? (
                        <span className="mt-1 flex items-center gap-1.5 text-sm">
                          <StarDisplay value={u.avgScore ?? 0} />
                          <span className="font-medium tabular-nums text-fg-soft">
                            {u.avgScore?.toFixed(1)}
                          </span>
                          <span className="text-subtle">
                            {t("ratings", { count: u.ratingCount })}
                          </span>
                        </span>
                      ) : (
                        <span className="mt-1 block text-sm text-subtle">
                          {t("notRated")}
                        </span>
                      ))}
                  </div>
                  {u.id !== me?.id && (
                    <div className="flex shrink-0 items-center gap-3">
                      {r === "WORKER" && (
                        <button
                          onClick={() => {
                            setEditingId(u.id);
                            setDraftSkills(u.skills);
                          }}
                          className="text-sm font-medium text-muted hover:text-fg hover:underline"
                        >
                          {t("changeSkills")}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          updateUser.mutate({
                            id: u.id,
                            isActive: !u.isActive,
                          })
                        }
                        className="text-sm font-medium text-muted hover:text-fg hover:underline"
                      >
                        {u.isActive ? t("deactivate") : t("reactivate")}
                      </button>
                    </div>
                  )}
                </div>
                {editingId === u.id && (
                  <div className="flex flex-col gap-3 border-t border-border pt-3">
                    {renderSkillPills(draftSkills, toggleDraftSkill)}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={updateUser.isPending}
                        loading={updateUser.isPending}
                        onClick={() =>
                          updateUser.mutate(
                            { id: u.id, skills: draftSkills },
                            { onSuccess: () => setEditingId(null) },
                          )
                        }
                      >
                        {t("save")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
