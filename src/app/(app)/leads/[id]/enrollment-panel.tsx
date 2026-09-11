"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StatusDimension } from "@/lib/domain/events";
import { confirmStatus, recordEnrollmentChange } from "./application-actions";

export function ConfirmStatusButton({
  personId,
  dimension,
}: {
  personId: string;
  dimension: StatusDimension;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      disabled={pending}
      data-testid={`confirm-status-${dimension}`}
      onClick={() =>
        startTransition(async () => {
          const formData = new FormData();
          formData.set("personId", personId);
          formData.set("dimension", dimension);
          const result = await confirmStatus({}, formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`ยืนยันสถานะ${dimension}แล้ว`);
          router.refresh();
        })
      }
    >
      ยืนยันว่ายังถูกต้อง
    </Button>
  );
}

const KIND_LABEL: Record<string, string> = {
  ดรอป: "ดรอป",
  กลับมาเรียน: "กลับมาเรียน",
  ลาออก: "ลาออก",
  ย้ายเทอม: "ย้ายเทอม",
};

export function EnrollmentPanel({
  personId,
  enrollmentStatus,
  creditBalance,
}: {
  personId: string;
  enrollmentStatus: string;
  creditBalance: number;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const available = [
    enrollmentStatus === "เรียนอยู่" ? "ดรอป" : null,
    enrollmentStatus === "ดรอป" ? "กลับมาเรียน" : null,
    enrollmentStatus !== "ลาออก" ? "ลาออก" : null,
    "ย้ายเทอม",
  ].filter((item): item is string => item !== null);

  return (
    <div className="rounded-md border p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">สถานะการเรียน</h2>
        {creditBalance > 0 ? (
          <span className="text-sm tabular-nums" data-testid="credit-balance">
            เครดิต {creditBalance.toLocaleString("th-TH")} บาท
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground mb-3 text-xs">
        ค่าเทอมที่ชำระแล้วไม่คืน แต่เก็บเป็นเครดิตไว้ให้ตอนกลับมาเรียน
      </p>

      <div className="flex flex-wrap gap-2">
        {available.map((item) => (
          <Dialog
            key={item}
            open={kind === item}
            onOpenChange={(next) => setKind(next ? item : null)}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid={`enrollment-${item}`}
              >
                {KIND_LABEL[item]}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader className="text-left">
                <DialogTitle>{KIND_LABEL[item]}</DialogTitle>
              </DialogHeader>

              <form
                action={(formData) => {
                  setError(null);
                  startTransition(async () => {
                    const result = await recordEnrollmentChange({}, formData);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    setKind(null);
                    toast.success(`บันทึก${KIND_LABEL[item]}แล้ว`);
                    router.refresh();
                  });
                }}
                className="mt-2 flex flex-col gap-4"
              >
                <input type="hidden" name="personId" value={personId} />
                <input type="hidden" name="kind" value={item} />

                {item === "ดรอป" ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="reason">เหตุผลที่ดรอป</Label>
                      <Input id="reason" name="reason" required />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="creditAmount">เครดิตค่าเทอมคงเหลือ (บาท)</Label>
                      <Input
                        id="creditAmount"
                        name="creditAmount"
                        inputMode="decimal"
                        placeholder="0"
                      />
                    </div>
                  </>
                ) : null}

                {item === "ลาออก" ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="reason">เหตุผล</Label>
                    <Input id="reason" name="reason" />
                  </div>
                ) : null}

                {item === "ย้ายเทอม" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="toAcademicYear">ย้ายไปปีการศึกษา</Label>
                      <Input
                        id="toAcademicYear"
                        name="toAcademicYear"
                        inputMode="numeric"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="toTerm">เทอม</Label>
                      <Input id="toTerm" name="toTerm" inputMode="numeric" />
                    </div>
                  </div>
                ) : null}

                {item === "กลับมาเรียน" ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="note">บันทึกย่อ</Label>
                    <Input id="note" name="note" />
                  </div>
                ) : null}

                {error ? (
                  <p role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={pending}
                  data-testid={`submit-enrollment-${item}`}
                >
                  บันทึก
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}
