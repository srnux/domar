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
import { Camera, Plus, X } from "lucide-react";
import { ApiError, api } from "@/lib/api-client";
import { useUsers } from "@/lib/users";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

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
    queryFn: () => api(`/api/properties/${property!.id}/checklist-template`),
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <Field label={t("name")}>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label={t("address")}>
        <Input
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </Field>
      <Field label={t("accessNotes")}>
        <Textarea
          value={accessNotes}
          onChange={(e) => setAccessNotes(e.target.value)}
          rows={3}
          placeholder={t("accessNotesHint")}
        />
      </Field>
      <Field label={t("owner")}>
        <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
          <option value="">{t("noOwner")}</option>
          {(owners ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.email})
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2/40 p-3">
        <legend className="px-1 text-sm font-semibold text-fg-soft">
          {t("cleaningChecklist")}
        </legend>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item.text}
              onChange={(e) =>
                setItems(
                  items.map((it, j) =>
                    j === i ? { ...it, text: e.target.value } : it,
                  ),
                )
              }
              className="flex-1"
            />
            <label
              title={t("photoRequired")}
              className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border ${
                item.photoRequired
                  ? "border-st-progress/40 bg-st-progress-soft text-st-progress"
                  : "border-border-strong text-subtle"
              }`}
            >
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
                className="sr-only"
              />
              <Camera size={16} aria-hidden />
            </label>
            <button
              type="button"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="grid size-10 shrink-0 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-st-declined"
              aria-label={t("remove")}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start text-accent-fg hover:text-accent-fg"
          onClick={() =>
            setItems([...items, { text: "", photoRequired: false }])
          }
        >
          <Plus size={15} aria-hidden /> {t("addItem")}
        </Button>
      </fieldset>

      {property && (
        <label className="flex items-center gap-2 text-sm font-medium text-fg-soft">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 accent-accent"
          />
          {t("active")}
        </label>
      )}

      {save.isError && (
        <p role="alert" className="text-sm text-st-declined">
          {save.error.message}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={save.isPending}
        loading={save.isPending}
      >
        {save.isPending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
