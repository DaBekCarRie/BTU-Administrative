"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExamRequest } from "@/lib/data/exams";
import { KNOWN_CENTERS } from "@/lib/exams-shared";
import { requestExamCenter, withdrawExamRequest } from "@/app/(app)/exams/actions";

export function ExamPanel({
  personId,
  requests,
}: {
  personId: string;
  requests: ExamRequest[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const thisYear = new Date().getFullYear() + 543;

  return (
    <div className="rounded-md border p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold">ศูนย์สอบพิเศษ</h2>
        {!adding ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}
            data-testid="add-exam-request"
          >
            ขอศูนย์สอบ
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground mb-3 text-xs">
        ไม่ซิงก์กับระบบลงทะเบียนสอบของมหาวิทยาลัย ต้องไปเช็กเอง
      </p>

      {adding ? (
        <form
          action={(formData) =>
            startTransition(async () => {
              const result = await requestExamCenter({}, formData);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              setAdding(false);
              toast.success("บันทึกคำขอศูนย์สอบแล้ว");
              router.refresh();
            })
          }
          className="mb-3 flex flex-col gap-2"
        >
          <input type="hidden" name="personId" value={personId} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="centerName" className="text-xs">
              ศูนย์สอบ
            </Label>
            <Input
              id="centerName"
              name="centerName"
              list="known-centers"
              className="h-8"
              required
            />
            <datalist id="known-centers">
              {KNOWN_CENTERS.map((center) => (
                <option key={center} value={center} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="examYear" className="text-xs">
              ปีการศึกษา
            </Label>
            <Input
              id="examYear"
              name="academicYear"
              defaultValue={thisYear}
              inputMode="numeric"
              className="h-8"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending} data-testid="submit-exam-request">
              บันทึก
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              ยกเลิก
            </Button>
          </div>
        </form>
      ) : null}

      {requests.length === 0 ? (
        <p className="text-muted-foreground text-sm">ยังไม่มีคำขอ</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm" data-testid="exam-requests">
          {requests.map((request) => (
            <li key={request.id} className="flex items-center justify-between gap-2">
              <span>
                {request.centerName}
                <span className="text-muted-foreground"> · {request.academicYear}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge
                  variant={request.status === "ถอนแล้ว" ? "outline" : "secondary"}
                >
                  {request.status}
                </Badge>
                {request.status !== "ถอนแล้ว" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    disabled={pending}
                    data-testid={`withdraw-${request.id}`}
                    onClick={() =>
                      startTransition(async () => {
                        const formData = new FormData();
                        formData.set("personId", personId);
                        formData.set("requestId", request.id);
                        formData.set("centerName", request.centerName);
                        const result = await withdrawExamRequest({}, formData);
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("ถอนคำขอแล้ว");
                        router.refresh();
                      })
                    }
                  >
                    ถอน
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
