"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FacultyWithPrograms } from "@/lib/data/master-data";
import { Constants } from "@/types/database";

type StaffOption = { id: string; display_name: string };

const selectClass =
  "border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function LeadFilters({
  faculties,
  staff,
}: {
  faculties: FacultyWithPrograms[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // เปลี่ยนตัวกรองแล้วต้องกลับหน้าแรก
    startTransition(() => router.push(`/leads?${next.toString()}`));
  }

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem(
          "q",
        ) as HTMLInputElement;
        update("q", input.value.trim());
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="q" className="text-muted-foreground text-xs">
          ค้นหา
        </label>
        <Input
          id="q"
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="ชื่อไทย ชื่อ Facebook หรือเบอร์"
          className="w-64"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-muted-foreground text-xs">
          สถานะติดตาม
        </label>
        <select
          id="status"
          className={selectClass}
          value={params.get("status") ?? ""}
          onChange={(e) => update("status", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {Constants.public.Enums.follow_up_status.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="facultyId" className="text-muted-foreground text-xs">
          คณะ
        </label>
        <select
          id="facultyId"
          className={selectClass}
          value={params.get("facultyId") ?? ""}
          onChange={(e) => update("facultyId", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {faculties.map((faculty) => (
            <option key={faculty.id} value={faculty.id}>
              {faculty.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="studyMode" className="text-muted-foreground text-xs">
          ภาค
        </label>
        <select
          id="studyMode"
          className={selectClass}
          value={params.get("studyMode") ?? ""}
          onChange={(e) => update("studyMode", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {Constants.public.Enums.study_mode.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ownerId" className="text-muted-foreground text-xs">
          ผู้ดูแล
        </label>
        <select
          id="ownerId"
          className={selectClass}
          value={params.get("ownerId") ?? ""}
          onChange={(e) => update("ownerId", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.display_name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="secondary" disabled={pending}>
        ค้นหา
      </Button>

      {params.toString() ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => startTransition(() => router.push("/leads"))}
        >
          ล้างตัวกรอง
        </Button>
      ) : null}
    </form>
  );
}
