"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

import { toFunnelSearchParams, type FunnelFilters } from "@/lib/data/funnel-filters";
import { Constants } from "@/types/database";

const selectClass =
  "border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

/**
 * ตัวกรองของกระดานภาพรวม (ใบ 09) — ค่าอยู่ใน URL ส่งลิงก์ให้กันได้ และกดย้อนกลับได้
 * กรองทั้งกระดาน ไม่ใช่เพิ่มคอลัมน์
 */
export function HomeFunnelFilters({
  filters,
  faculties,
  months,
}: {
  filters: FunnelFilters;
  faculties: { id: string; name: string }[];
  /** ป้ายชื่อเดือน เรียงจากเดือนนี้ย้อนหลัง — ตำแหน่งในลิสต์คือ -offset */
  months: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ค่าล่าสุดที่เลือก — props และ URL ยังเป็นค่าเก่าจนหน้าใหม่ render เสร็จ
  // ถ้าอ่านจากสองอย่างนั้น เปลี่ยนสองช่องติดกันเร็ว ๆ ค่าที่เพิ่งล้างจะกลับมา
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  }, [filters]);

  function update(next: Partial<FunnelFilters>) {
    latest.current = { ...latest.current, ...next };
    const query = toFunnelSearchParams(latest.current).toString();
    startTransition(() => router.push(query ? `/?${query}` : "/"));
  }

  const filtered = !!filters.facultyId || !!filters.studyMode || filters.monthOffset !== 0;

  return (
    <div
      data-testid="funnel-filters"
      aria-busy={pending}
      className="mb-2 flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="funnel-month" className="text-muted-foreground text-xs">
          เดือน
        </label>
        <select
          id="funnel-month"
          className={selectClass}
          value={String(filters.monthOffset)}
          onChange={(event) => update({ monthOffset: Number(event.target.value) })}
        >
          {months.map((label, index) => (
            <option key={label} value={String(-index)}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="funnel-faculty" className="text-muted-foreground text-xs">
          คณะ
        </label>
        <select
          id="funnel-faculty"
          className={selectClass}
          value={filters.facultyId}
          onChange={(event) => update({ facultyId: event.target.value })}
        >
          <option value="">ทุกคณะ</option>
          {faculties.map((faculty) => (
            <option key={faculty.id} value={faculty.id}>
              {faculty.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="funnel-mode" className="text-muted-foreground text-xs">
          ภาค
        </label>
        <select
          id="funnel-mode"
          className={selectClass}
          value={filters.studyMode}
          // ค่ามาจากตัวเลือกที่สร้างจาก enum ข้างล่างเท่านั้น
          onChange={(event) => update({ studyMode: event.target.value as FunnelFilters["studyMode"] })}
        >
          <option value="">ทุกภาค</option>
          {Constants.public.Enums.study_mode.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      {filtered ? (
        <Link href="/" className="text-primary h-9 px-1 text-sm leading-9 underline-offset-4 hover:underline">
          ล้างตัวกรอง
        </Link>
      ) : null}
    </div>
  );
}
