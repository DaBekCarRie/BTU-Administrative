"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import type { ApplicationRow } from "@/lib/data/applications";
import type { FacultyWithPrograms } from "@/lib/data/master-data";
import { toDateInputValue } from "@/lib/date";
import { Constants } from "@/types/database";
import {
  createApplication,
  openSlip,
  recordPayment,
  saveStudentCode,
} from "./application-actions";
import { thaiYearNow } from "@/lib/date";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";

const selectClass =
  "border-input bg-background h-9 rounded-md border px-2 text-sm";

/** ย่อรูปสลิปแบบเดียวกับเอกสารประจำตัว แล้วเก็บใต้โฟลเดอร์ของคนนั้น */
async function uploadSlip(
  personId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  const prepared = file.type.startsWith("image/")
    ? await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1600, useWebWorker: true })
    : file;
  const extension = file.name.split(".").pop() ?? "bin";
  const path = `${personId}/slip-${Date.now()}.${extension}`;

  const { error } = await createClient()
    .storage.from("documents")
    .upload(path, prepared, { upsert: true });
  if (error) return { error: `อัปโหลดสลิปไม่สำเร็จ: ${error.message}` };
  return { path };
}

function SlipButton({ paymentId, personId }: { paymentId: string; personId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      data-testid={`slip-${paymentId}`}
      onClick={() =>
        startTransition(async () => {
          const result = await openSlip(paymentId, personId);
          if (result.error || !result.url) {
            toast.error(result.error ?? "เปิดสลิปไม่สำเร็จ");
            return;
          }
          window.open(result.url, "_blank", "noopener");
        })
      }
    >
      เปิดสลิป
    </Button>
  );
}

const baht = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function AddApplicationDialog({
  personId,
  faculties,
}: {
  personId: string;
  faculties: FacultyWithPrograms[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [facultyId, setFacultyId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const programs = faculties.find((f) => f.id === facultyId)?.programs ?? [];
  const thisYear = thaiYearNow();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="add-application">
          เพิ่มการสมัคร
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>เพิ่มการสมัคร</DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await createApplication({}, formData);
              if (result.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              toast.success("บันทึกการสมัครแล้ว");
              router.refresh();
            });
          }}
          className="mt-2 flex flex-col gap-4"
        >
          <input type="hidden" name="personId" value={personId} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="academicYear">ปีการศึกษา (พ.ศ.)</Label>
              <Input
                id="academicYear"
                name="academicYear"
                inputMode="numeric"
                defaultValue={thisYear}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="term">เทอม</Label>
              <Input id="term" name="term" inputMode="numeric" placeholder="1" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="app-facultyId">คณะ</Label>
            <select
              id="app-facultyId"
              name="facultyId"
              className={selectClass}
              value={facultyId}
              onChange={(event) => setFacultyId(event.target.value)}
            >
              <option value="">— ยังไม่ระบุ —</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="app-programId">สาขา</Label>
            <select
              key={facultyId}
              id="app-programId"
              name="programId"
              className={selectClass}
              disabled={!facultyId}
              defaultValue=""
            >
              <option value="">{facultyId ? "— ยังไม่ระบุ —" : "เลือกคณะก่อน"}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="app-studyMode">ภาค</Label>
            <select id="app-studyMode" name="studyMode" className={selectClass} defaultValue="">
              <option value="">— ยังไม่ระบุ —</option>
              {Constants.public.Enums.study_mode.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} data-testid="submit-application">
            บันทึก
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  personId,
  application,
}: {
  personId: string;
  application: ApplicationRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`pay-${application.id}`}>
          บันทึกการชำระ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>บันทึกการชำระเงิน</DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              // อัปโหลดสลิปจากเบราว์เซอร์ก่อน แล้วส่งแค่ path ไปให้ server action
              const slip = formData.get("slipFile");
              formData.delete("slipFile");
              if (slip instanceof File && slip.size > 0) {
                const uploaded = await uploadSlip(personId, slip);
                if ("error" in uploaded) {
                  setError(uploaded.error);
                  return;
                }
                formData.set("slipPath", uploaded.path);
              }

              const result = await recordPayment({}, formData);
              if (result.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              toast.success("บันทึกการชำระแล้ว");
              router.refresh();
            });
          }}
          className="mt-2 flex flex-col gap-4"
        >
          <input type="hidden" name="personId" value={personId} />
          <input type="hidden" name="applicationId" value={application.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
              <Input id="amount" name="amount" inputMode="decimal" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="paidAt">วันที่ชำระ</Label>
              <Input
                id="paidAt"
                name="paidAt"
                type="date"
                defaultValue={toDateInputValue()}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="paymentStatus">สถานะการเงินที่ฝ่ายการเงินแจ้ง</Label>
            <select
              id="paymentStatus"
              name="paymentStatus"
              className={selectClass}
              defaultValue="ผ่อนอยู่"
              required
            >
              {Constants.public.Enums.payment_status.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              ระบบไม่คำนวณเอง เพราะยอดค่าเทอมจริงอยู่ที่ฝ่ายการเงิน
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="receiptNo">เลขที่ใบเสร็จ</Label>
            <Input id="receiptNo" name="receiptNo" placeholder="เช่น RV:69-19030" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="slipFile">สลิป (รูปหรือ PDF)</Label>
            <Input
              id="slipFile"
              name="slipFile"
              type="file"
              accept="image/*,application/pdf"
              data-testid="slip-file"
            />
            <p className="text-muted-foreground text-xs">
              รูปจะถูกย่อขนาดอัตโนมัติ · แนบไว้ตรงนี้จะหาเจอจากไทม์ไลน์ทีหลัง
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} data-testid="submit-payment">
            บันทึก
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudentCodeForm({
  personId,
  application,
}: {
  personId: string;
  application: ApplicationRow;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (application.studentCode) {
    return (
      <span className="text-sm tabular-nums" data-testid={`code-${application.id}`}>
        รหัส {application.studentCode}
      </span>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await saveStudentCode({}, formData);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("บันทึกรหัสนักศึกษาแล้ว");
          router.refresh();
        })
      }
      className="flex items-center gap-2"
    >
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="applicationId" value={application.id} />
      <Input
        name="studentCode"
        aria-label="รหัสนักศึกษา"
        placeholder="รหัสนักศึกษา"
        className="h-8 w-40 tabular-nums"
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        data-testid={`save-code-${application.id}`}
      >
        บันทึกรหัส
      </Button>
    </form>
  );
}

export function ApplicationsPanel({
  personId,
  applications,
  faculties,
}: {
  personId: string;
  applications: ApplicationRow[];
  faculties: FacultyWithPrograms[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          การสมัคร
          <span className="text-muted-foreground ml-2 font-normal">
            {applications.length} รายการ
          </span>
        </h2>
        <AddApplicationDialog personId={personId} faculties={faculties} />
      </div>

      {applications.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          ยังไม่มีการสมัคร
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="application-list">
          {applications.map((application) => (
            <li key={application.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {application.programName ?? "ยังไม่ระบุหลักสูตร"} ·{" "}
                    {application.academicYear}
                    {application.term ? `/${application.term}` : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {application.facultyName ?? "—"}
                    {application.studyMode ? ` · ${application.studyMode}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{application.status}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm tabular-nums">
                  ชำระแล้ว {baht.format(application.totalPaid)}
                </span>
                <PaymentDialog personId={personId} application={application} />
                <StudentCodeForm personId={personId} application={application} />
              </div>

              {application.payments.length > 0 ? (
                <ul className="text-muted-foreground mt-3 flex flex-col gap-1 border-t pt-2 text-xs">
                  {application.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center gap-2 tabular-nums">
                      <span>
                        {payment.paidAt} · {baht.format(payment.amount)}
                        {payment.receiptNo ? ` · ${payment.receiptNo}` : ""}
                      </span>
                      {payment.slipPath ? (
                        <SlipButton paymentId={payment.id} personId={personId} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
