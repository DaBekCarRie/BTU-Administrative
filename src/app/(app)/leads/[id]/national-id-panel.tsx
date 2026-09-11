"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { revealNationalId, saveNationalId } from "../actions";

/**
 * หน้าจอปกติเห็นแค่ 4 ตัวท้าย ต้องกดปุ่มถึงจะเห็นเลขเต็ม
 * และการกดนั้นถูกบันทึกที่ฐานข้อมูลโดยเลี่ยงไม่ได้
 */
export function NationalIdPanel({
  personId,
  last4,
}: {
  personId: string;
  last4: string | null;
}) {
  const router = useRouter();
  const [full, setFull] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function reveal() {
    startTransition(async () => {
      const result = await revealNationalId(personId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setFull(result.value ?? null);
    });
  }

  function save(formData: FormData) {
    startTransition(async () => {
      const result = await saveNationalId({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("บันทึกเลขบัตรแล้ว");
      setEditing(false);
      setFull(null);
      router.refresh();
    });
  }

  return (
    <div>
      <dt className="text-muted-foreground text-xs">เลขบัตรประชาชน</dt>
      <dd className="mt-0.5 flex flex-wrap items-center gap-2">
        {editing ? (
          <form action={save} className="flex w-full items-center gap-2">
            <input type="hidden" name="personId" value={personId} />
            <Input
              name="nationalId"
              inputMode="numeric"
              placeholder="13 หลัก"
              aria-label="เลขบัตรประชาชน"
              className="w-44 tabular-nums"
            />
            <Button type="submit" size="sm" disabled={pending} data-testid="save-national-id">
              บันทึก
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              ยกเลิก
            </Button>
          </form>
        ) : (
          <>
            <span className="tabular-nums" data-testid="national-id-display">
              {full ?? (last4 ? `•••••••••${last4}` : "—")}
            </span>

            {last4 && !full ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={reveal}
                data-testid="reveal-national-id"
              >
                แสดงเลขเต็ม
              </Button>
            ) : null}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              data-testid="edit-national-id"
            >
              {last4 ? "แก้ไข" : "เพิ่ม"}
            </Button>
          </>
        )}
      </dd>
      {last4 ? (
        <p className="text-muted-foreground mt-1 text-xs">
          การกดแสดงเลขเต็มถูกบันทึกไว้
        </p>
      ) : null}
    </div>
  );
}
