"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

import { Input } from "@/components/ui/input";
import { thaiYearNow } from "@/lib/date";
import { REFERENCE_CATEGORIES, type ReferenceFilters } from "@/lib/reference-shared";

const selectClass = "border-input bg-background h-9 rounded-md border px-2 text-sm";

function toQuery(filters: ReferenceFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.year) params.set("year", filters.year);
  const query = params.toString();
  return query ? `/reference?${query}` : "/reference";
}

/** ค้นและกรองเอกสารอ้างอิง (ใบ 07) — ค่าอยู่ใน URL ใช้ร่วมกันได้ทุกตัว */
export function ReferenceFiltersBar({ filters }: { filters: ReferenceFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const years = Array.from({ length: 7 }, (_, index) => thaiYearNow() + 1 - index);

  // ค่าล่าสุดที่เลือก — props และ URL ยังเป็นค่าเก่าจนหน้าใหม่ render เสร็จ
  // ถ้าอ่านจากสองอย่างนั้น เปลี่ยนสองช่องติดกันเร็ว ๆ ค่าที่เพิ่งล้างจะกลับมา
  const latest = useRef(filters);
  useEffect(() => {
    latest.current = filters;
  }, [filters]);

  function update(next: Partial<ReferenceFilters>) {
    latest.current = { ...latest.current, ...next };
    const query = toQuery(latest.current);
    startTransition(() => router.push(query));
  }

  const filtered = !!filters.q || !!filters.category || !!filters.year;

  return (
    <form
      data-testid="reference-filters"
      aria-busy={pending}
      className="mb-4 flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem("q") as HTMLInputElement;
        update({ q: input.value.trim() });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="reference-q" className="text-muted-foreground text-xs">
          ค้นชื่อเรื่อง
        </label>
        <Input
          id="reference-q"
          name="q"
          defaultValue={filters.q}
          placeholder="พิมพ์บางส่วนของชื่อเรื่อง"
          className="w-full sm:w-64"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reference-filter-category" className="text-muted-foreground text-xs">
          หมวด
        </label>
        <select
          id="reference-filter-category"
          className={selectClass}
          value={filters.category}
          // ค่ามาจากตัวเลือกที่สร้างจาก enum ข้างล่างเท่านั้น
          onChange={(event) => update({ category: event.target.value as ReferenceFilters["category"] })}
        >
          <option value="">ทุกหมวด</option>
          {REFERENCE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reference-filter-year" className="text-muted-foreground text-xs">
          ปีการศึกษา
        </label>
        <select
          id="reference-filter-year"
          className={selectClass}
          value={filters.year}
          onChange={(event) => update({ year: event.target.value })}
        >
          <option value="">ทุกปี</option>
          <option value="none">ไม่ผูกกับปี</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
          {filters.year && filters.year !== "none" && !years.includes(Number(filters.year)) ? (
            <option value={filters.year}>{filters.year}</option>
          ) : null}
        </select>
      </div>

      {filtered ? (
        <Link href="/reference" className="text-primary h-9 px-1 text-sm leading-9 underline-offset-4 hover:underline">
          ล้างตัวกรอง
        </Link>
      ) : null}
    </form>
  );
}
