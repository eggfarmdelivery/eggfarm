"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateZone } from "./actions";

export default function ZoneSelect({
  zones,
  currentZoneId,
}: {
  zones: { id: string; name: string }[];
  currentZoneId: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleChange(zoneId: string) {
    setSaving(true);
    const formData = new FormData();
    formData.set("zone_id", zoneId);
    await updateZone(formData);
    router.refresh();
    setSaving(false);
  }

  return (
    <select
      defaultValue={currentZoneId ?? ""}
      disabled={saving}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm"
    >
      <option value="" disabled>
        단지를 선택해주세요
      </option>
      {zones.map((z) => (
        <option key={z.id} value={z.id}>
          {z.name}
        </option>
      ))}
    </select>
  );
}
