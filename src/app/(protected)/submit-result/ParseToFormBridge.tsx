// src/app/(protected)/submit-result/ParseToFormBridge.tsx
"use client";

import ParseFromUrl from "./ParseFromUrl";

type FieldMap = Partial<Record<
  // form field names we try to fill
  "event" | "mark" | "timing" | "wind" | "meet_name" | "meet_date" | "proof_url" | "athlete_id" | "notes",
  string
>>;

export default function ParseToFormBridge() {
  function applyToForm(data?: any) {
    if (!data) return;
    const form = document.getElementById("submit-result-form") as HTMLFormElement | null;
    if (!form) return;

    // map parsed payload → string values
    const map: FieldMap = {
      event: data.event ?? "",
      mark: data.mark ?? (typeof data.mark_seconds_adj === "number" ? String(data.mark_seconds_adj) : ""),
      timing: data.timing ?? "",
      wind: data.wind ?? "",
      meet_name: data.meet_name ?? "",
      meet_date: data.meet_date ?? "",
      proof_url: data.proof_url ?? "",
      athlete_id: data.athlete_id ?? "",
      notes: data.notes ?? "",
    };

    // Fill inputs/selects/textarea if they exist by name
    Object.entries(map).forEach(([name, value]) => {
      if (value == null) return;
      const el =
        form.querySelector<HTMLInputElement>(`input[name="${name}"]`) ??
        form.querySelector<HTMLTextAreaElement>(`textarea[name="${name}"]`) ??
        form.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
      if (!el) return;

      // set value + trigger input event so React controlled fields notice
      (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  return (
    <ParseFromUrl
      onParsed={(data) => {
        try {
          applyToForm(data);
        } catch {
          // ignore
        }
      }}
      className="mb-4"
    />
  );
}
