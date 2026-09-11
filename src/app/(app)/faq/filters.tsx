"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Constants } from "@/types/database";

export function FaqFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.push(`/faq?${next.toString()}`));
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
          placeholder="พิมพ์คำในคำถามหรือคำตอบ"
          className="w-72"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="visibility" className="text-muted-foreground text-xs">
          ใช้ตอบใคร
        </label>
        <select
          id="visibility"
          className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          value={params.get("visibility") ?? ""}
          onChange={(event) => update("visibility", event.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {Constants.public.Enums.answer_visibility.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="secondary">
        ค้นหา
      </Button>
    </form>
  );
}
