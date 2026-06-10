"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  ChecklistTemplateItemDto,
  CreatePropertyPayload,
  PropertyDto,
} from "@domar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "@/lib/api-client";
import { useUsers } from "@/lib/users";

interface TemplateRow {
  text: string;
  photoRequired: boolean;
}

export function PropertyForm({ property }: { property?: PropertyDto }) {
  const t = useTranslations("properties");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: owners } = useUsers({ role: "OWNER" });

  const [name, setName] = useState(property?.name ?? "");
  const [address, setAddress] = useState(property?.address ?? "");
  const [accessNotes, setAccessNotes] = useState(property?.accessNotes ?? "");
  const [ownerId, setOwnerId] = useState(property?.ownerId ?? "");
  const [isActive, setIsActive] = useState(property?.isActive ?? true);
  const [items, setItems] = useState<TemplateRow[]>([]);

  const template = useQuery<ChecklistTemplateItemDto[], ApiError>({
    queryKey: ["template", property?.id],
    queryFn: () =>
      api(`/api/properties/${property!.id}/checklist-template`),
    enabled: !!property,
  });

  useEffect(() => {
    if (template.data) {
      setItems(
        template.data.map((i) => ({
          text: i.text,
          photoRequired: i.photoRequired,
        })),
      );
    }
  }, [template.data]);

  const save = useMutation<PropertyDto, ApiError, void>({
    mutationFn: async () => {
      const payload: CreatePropertyPayload & { isActive?: boolean } = {
        name,
        address,
        accessNotes: accessNotes || undefined,
        ownerId: ownerId || undefined,
        ...(property ? { isActive } : {}),
      };
      const saved = property
        ? await api<PropertyDto>(`/api/properties/${property.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api<PropertyDto>("/api/properties", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      await api(`/api/properties/${saved.id}/checklist-template`, {
        method: "PUT",
        body: JSON.stringify({
          items: items.filter((i) => i.text.trim()),
        }),
      });
      return saved;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      router.push("/manage/properties");
    },
  });

  const input =
    "rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base outline-none focus:border-neutral-800";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("name")}
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("address")}
        <input
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("accessNotes")}
        <textarea
          value={accessNotes}
          onChange={(e) => setAccessNotes(e.target.value)}
          rows={3}
          placeholder={t("accessNotesHint")}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("owner")}
        <select
          value={ownerId}
          onChange={(e) => setOwnerId(e.target.value)}
          className={input}
        >
          <option value="">{t("noOwner")}</option>
          {(owners ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.email})
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3">
        <legend className="px-1 text-sm font-semibold">
          {t("cleaningChecklist")}
        </legend>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item.text}
              onChange={(e) =>
                setItems(
                  items.map((it, j) =>
                    j === i ? { ...it, text: e.target.value } : it,
                  ),
                )
              }
              className={`flex-1 ${input}`}
            />
            <label className="flex items-center gap-1 text-xs text-neutral-500">
              <input
                type="checkbox"
                checked={item.photoRequired}
                onChange={(e) =>
                  setItems(
                    items.map((it, j) =>
                      j === i
                        ? { ...it, photoRequired: e.target.checked }
                        : it,
                    ),
                  )
                }
              />
              📷
            </label>
            <button
              type="button"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="text-neutral-400"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems([...items, { text: "", photoRequired: false }])}
          className="self-start text-sm font-medium text-blue-600"
        >
          + {t("addItem")}
        </button>
      </fieldset>

      {property && (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {t("active")}
        </label>
      )}

      {save.isError && (
        <p role="alert" className="text-sm text-red-600">
          {save.error.message}
        </p>
      )}
      <button
        type="submit"
        disabled={save.isPending}
        className="rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50"
      >
        {save.isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
