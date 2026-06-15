"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import {
  AdminCompanyDto,
  useCompanies,
  useCreateCompany,
  useSetCompanyStatus,
  useUpdateCompany,
} from "@/lib/admin";
import { Button, Card, Field, Input, PageSpinner } from "@/components/ui";

export default function AdminCompaniesPage() {
  const { data: companies, isPending, isError } = useCompanies();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Building2 size={22} aria-hidden /> Companies
        </h1>
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus size={16} aria-hidden /> New company
        </Button>
      </div>

      {showCreate && (
        <CreateCompanyForm onDone={() => setShowCreate(false)} />
      )}

      {isPending && <PageSpinner />}
      {isError && (
        <p role="alert" className="text-sm text-st-declined">
          Failed to load companies.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {companies?.map((c) => (
          <CompanyRow key={c.id} company={c} />
        ))}
        {companies?.length === 0 && (
          <p className="text-sm text-muted">No companies yet.</p>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: AdminCompanyDto["status"] }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-st-verified-soft text-st-verified"
          : "bg-st-declined-soft text-st-declined"
      }`}
    >
      {status}
    </span>
  );
}

function CompanyRow({ company }: { company: AdminCompanyDto }) {
  const update = useUpdateCompany();
  const setStatus = useSetCompanyStatus();
  const [maxSeats, setMaxSeats] = useState(String(company.maxSeats));
  const overCap = company.seatsUsed > company.maxSeats;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{company.name}</span>
            <StatusBadge status={company.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Owner: {company.owner?.email ?? "—"} · Plan: {company.plan ?? "—"} ·
            Fee: €{(company.monthlyFeeCents / 100).toFixed(2)}/mo
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Field label="Seats" className="w-28">
            <Input
              type="number"
              min={1}
              value={maxSeats}
              onChange={(e) => setMaxSeats(e.target.value)}
            />
          </Field>
          <span
            className={`self-end pb-2.5 text-sm ${overCap ? "text-st-declined" : "text-muted"}`}
          >
            {company.seatsUsed} used
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={
            update.isPending || Number(maxSeats) === company.maxSeats
          }
          loading={update.isPending}
          onClick={() =>
            update.mutate({
              id: company.id,
              patch: { maxSeats: Number(maxSeats) },
            })
          }
        >
          Save seats
        </Button>
        {company.status === "ACTIVE" ? (
          <Button
            size="sm"
            variant="danger"
            loading={setStatus.isPending}
            onClick={() =>
              setStatus.mutate({ id: company.id, action: "suspend" })
            }
          >
            Suspend
          </Button>
        ) : (
          <Button
            size="sm"
            loading={setStatus.isPending}
            onClick={() =>
              setStatus.mutate({ id: company.id, action: "activate" })
            }
          >
            Activate
          </Button>
        )}
        {(update.isError || setStatus.isError) && (
          <span role="alert" className="text-sm text-st-declined">
            {(update.error ?? setStatus.error)?.message}
          </span>
        )}
      </div>
    </Card>
  );
}

function CreateCompanyForm({ onDone }: { onDone: () => void }) {
  const create = useCreateCompany();
  const [form, setForm] = useState({
    name: "",
    maxSeats: "5",
    plan: "standard",
    monthlyFee: "99",
    supEmail: "",
    supName: "",
    supPassword: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        name: form.name,
        maxSeats: Number(form.maxSeats),
        plan: form.plan || undefined,
        monthlyFeeCents: Math.round(Number(form.monthlyFee) * 100),
        supervisor: {
          email: form.supEmail,
          name: form.supName,
          password: form.supPassword,
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <Card className="mb-5 p-4">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">New company</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name">
            <Input required value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Max seats (staff)">
            <Input
              type="number"
              min={1}
              required
              value={form.maxSeats}
              onChange={set("maxSeats")}
            />
          </Field>
          <Field label="Plan">
            <Input value={form.plan} onChange={set("plan")} />
          </Field>
          <Field label="Monthly fee (€)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.monthlyFee}
              onChange={set("monthlyFee")}
            />
          </Field>
        </div>
        <p className="mt-1 text-sm font-medium text-fg-soft">
          Initial supervisor (account owner)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name">
            <Input required value={form.supName} onChange={set("supName")} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              value={form.supEmail}
              onChange={set("supEmail")}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              required
              minLength={8}
              value={form.supPassword}
              onChange={set("supPassword")}
            />
          </Field>
        </div>
        {create.isError && (
          <p role="alert" className="text-sm text-st-declined">
            {create.error.message}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={create.isPending}
            disabled={create.isPending}
          >
            Create company
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
