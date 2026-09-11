"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CALL_OUTCOMES, type CallOutcome } from "@/lib/domain/events";
import { logCall } from "../actions";

/** ตัวเลือกลัดของวันนัดครั้งถัดไป — ลดการเปิดปฏิทินในงานที่ทำวันละหลายสิบครั้ง */
const QUICK_DAYS = [
  { label: "พรุ่งนี้", days: 1 },
  { label: "3 วัน", days: 3 },
  { label: "1 สัปดาห์", days: 7 },
] as const;

/** ผลที่ถือว่าจบแล้ว ไม่ต้องถามวันนัดต่อ */
const CLOSING: ReadonlySet<CallOutcome> = new Set([
  "คุยแล้วไม่สนใจ",
  "สมัครแล้ว",
]);

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function LogCallDialog({
  personId,
  personName,
}: {
  personId: string;
  personName: string;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [nextCallDate, setNextCallDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * เรียก action เองแทน useActionState เพราะต้องรู้ผลลัพธ์ทันทีเพื่อปิดกล่อง
   * ถ้าไม่ปิด ผู้ใช้จะกดบันทึกซ้ำแล้วเกิดเหตุการณ์ซ้ำ
   */
  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await logCall({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setOutcome(null);
      setNextCallDate("");
      toast.success("บันทึกผลโทรแล้ว");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="open-log-call">บันทึกผลโทร</Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-y-auto sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>บันทึกผลโทร</DialogTitle>
          <DialogDescription>{personName}</DialogDescription>
        </DialogHeader>

        <form action={submit} className="mt-4 flex flex-col gap-5">
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="outcome" value={outcome ?? ""} />
          <input type="hidden" name="nextCallAt" value={nextCallDate} />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">ผลการโทร</span>
            <div className="grid grid-cols-2 gap-2">
              {CALL_OUTCOMES.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={outcome === option ? "default" : "outline"}
                  className="h-12 text-sm"
                  data-testid={`outcome-${option}`}
                  onClick={() => {
                    setOutcome(option);
                    if (CLOSING.has(option)) setNextCallDate("");
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          {outcome && !CLOSING.has(outcome) ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">นัดโทรครั้งถัดไป</span>
              <div className="flex flex-wrap gap-2">
                {QUICK_DAYS.map((quick) => (
                  <Button
                    key={quick.days}
                    type="button"
                    size="sm"
                    variant={
                      nextCallDate === addDays(quick.days) ? "default" : "outline"
                    }
                    onClick={() => setNextCallDate(addDays(quick.days))}
                  >
                    {quick.label}
                  </Button>
                ))}
                <Input
                  type="date"
                  aria-label="เลือกวันเอง"
                  className="w-40"
                  value={nextCallDate}
                  onChange={(event) => setNextCallDate(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="occurredAt">วันที่โทรจริง</Label>
            <Input
              id="occurredAt"
              name="occurredAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-muted-foreground text-xs">
              แก้เป็นวันย้อนหลังได้ ถ้าโทรไปแล้วเพิ่งมาบันทึก
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">บันทึกย่อ</Label>
            <Textarea id="note" name="note" rows={2} />
          </div>

          {error ? (
            <p role="alert" data-testid="call-error" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          {/* ปุ่มหลักอยู่ล่างสุด กดด้วยนิ้วโป้งได้บนมือถือ */}
          <Button
            type="submit"
            size="lg"
            className="sticky bottom-0 w-full"
            disabled={pending || !outcome}
            data-testid="submit-log-call"
          >
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
