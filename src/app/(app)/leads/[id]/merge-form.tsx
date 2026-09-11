"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { checkDuplicatePhone, mergeLeads } from "../actions";
import type { DuplicateMatch } from "@/lib/data/people";

/**
 * รวมรายการซ้ำ — แสดงเฉพาะเมื่อมีคนอื่นใช้เบอร์เดียวกัน และเฉพาะหัวหน้าทีม
 * รายการนี้จะเป็นผู้รอด ส่วนอีกรายการถูกดูดเข้ามาแล้วหายไป
 */
export function MergeForm({
  personId,
  phone,
}: {
  personId: string;
  phone: string | null;
}) {
  const router = useRouter();
  const [matches, setMatches] = useState<DuplicateMatch[] | null>(null);
  const [pending, startTransition] = useTransition();

  function find() {
    if (!phone) return;
    startTransition(async () => {
      setMatches(await checkDuplicatePhone(phone, personId));
    });
  }

  function merge(mergedId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("survivorId", personId);
      formData.set("mergedId", mergedId);

      const result = await mergeLeads({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("รวมข้อมูลแล้ว ประวัติทั้งสองอยู่ในไทม์ไลน์เดียวกัน");
      setMatches([]);
      router.refresh();
    });
  }

  if (!phone) return null;

  return (
    <div className="rounded-md border p-4">
      <h2 className="text-sm font-semibold">รายการซ้ำ</h2>
      <p className="text-muted-foreground mt-1 mb-3 text-xs">
        รวมแล้วประวัติของทั้งสองจะมาอยู่ที่รายการนี้ ย้อนกลับไม่ได้
      </p>

      {matches === null ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={find}
          disabled={pending}
          data-testid="find-duplicates"
        >
          ค้นหารายการที่ใช้เบอร์เดียวกัน
        </Button>
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground text-sm" data-testid="no-duplicates">
          ไม่พบรายการที่ใช้เบอร์เดียวกัน
        </p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="duplicate-list">
          {matches.map((match) => (
            <li key={match.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm">{match.fullName}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                data-testid={`merge-${match.id}`}
                onClick={() => merge(match.id)}
              >
                รวมเข้ามา
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
