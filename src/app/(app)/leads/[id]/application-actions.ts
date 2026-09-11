"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { recordEvent } from "@/lib/data/people";
import type { PaymentStatus, StudyMode } from "@/lib/domain/events";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Enums } from "@/types/database";

export type AppFormState = { error?: string; ok?: boolean };

function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

/** ยื่นสมัคร = สร้างการสมัครหนึ่งรายการ + เหตุการณ์ `ยื่นสมัคร` */
export async function createApplication(
  _prev: AppFormState,
  formData: FormData,
): Promise<AppFormState> {
  const personId = text(formData, "personId");
  const year = Number(text(formData, "academicYear"));
  if (!personId) return { error: "ไม่พบรายการ" };
  if (!Number.isInteger(year) || year < 2500 || year > 2600) {
    return { error: "ปีการศึกษาต้องเป็น พ.ศ. เช่น 2569" };
  }

  const facultyId = text(formData, "facultyId");
  const programId = text(formData, "programId");
  const rawMode = text(formData, "studyMode");
  const studyMode = (
    Constants.public.Enums.study_mode as readonly string[]
  ).includes(rawMode ?? "")
    ? (rawMode as StudyMode)
    : null;

  const supabase = await createClient();
  const applicationId = randomUUID();

  const { error } = await supabase.from("applications").insert({
    id: applicationId,
    person_id: personId,
    academic_year: year,
    term: Number(text(formData, "term")) || null,
    faculty_id: facultyId,
    program_id: programId,
    study_mode: studyMode as Enums<"study_mode"> | null,
    status: "รอเอกสาร",
  });
  if (error) return { error: `บันทึกการสมัครไม่สำเร็จ: ${error.message}` };

  await recordEvent(personId, {
    type: "ยื่นสมัคร",
    occurredAt: new Date().toISOString(),
    payload: { applicationId, academicYear: year, facultyId, programId, studyMode },
  });

  revalidatePath(`/leads/${personId}`);
  return { ok: true };
}

/** บันทึกการชำระหนึ่งงวด + เหตุการณ์ `ชำระเงิน` */
export async function recordPayment(
  _prev: AppFormState,
  formData: FormData,
): Promise<AppFormState> {
  const personId = text(formData, "personId");
  const applicationId = text(formData, "applicationId");
  const amount = Number(text(formData, "amount"));
  const paidAt = text(formData, "paidAt");
  const rawStatus = text(formData, "paymentStatus");

  if (!personId || !applicationId) return { error: "ไม่พบการสมัคร" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "จำนวนเงินต้องมากกว่า 0" };
  }
  if (!paidAt) return { error: "ต้องระบุวันที่ชำระ" };
  if (
    !(Constants.public.Enums.payment_status as readonly string[]).includes(
      rawStatus ?? "",
    )
  ) {
    return { error: "ต้องเลือกสถานะการเงินที่ฝ่ายการเงินแจ้งมา" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("payments").insert({
    application_id: applicationId,
    amount,
    paid_at: paidAt,
    receipt_no: text(formData, "receiptNo"),
    note: text(formData, "note"),
    recorded_by: user?.id ?? null,
  });
  if (error) return { error: `บันทึกการชำระไม่สำเร็จ: ${error.message}` };

  await recordEvent(personId, {
    type: "ชำระเงิน",
    occurredAt: new Date(`${paidAt}T12:00:00+07:00`).toISOString(),
    payload: {
      applicationId,
      amount,
      paymentStatus: rawStatus as PaymentStatus,
    },
  });

  revalidatePath(`/leads/${personId}`);
  return { ok: true };
}

/** บันทึกรหัสนักศึกษาที่สำนักทะเบียนออกให้ */
export async function saveStudentCode(
  _prev: AppFormState,
  formData: FormData,
): Promise<AppFormState> {
  const personId = text(formData, "personId");
  const applicationId = text(formData, "applicationId");
  const studentCode = text(formData, "studentCode");

  if (!personId || !applicationId) return { error: "ไม่พบการสมัคร" };
  if (!studentCode) return { error: "ต้องกรอกรหัสนักศึกษา" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ student_code: studentCode, status: "อนุมัติ" })
    .eq("id", applicationId);

  if (error) {
    return {
      error: error.message.includes("duplicate")
        ? "รหัสนักศึกษานี้มีอยู่แล้วในระบบ"
        : `บันทึกรหัสไม่สำเร็จ: ${error.message}`,
    };
  }

  await recordEvent(personId, {
    type: "ได้รหัสนักศึกษา",
    occurredAt: new Date().toISOString(),
    payload: { applicationId, studentCode },
  });

  revalidatePath(`/leads/${personId}`);
  return { ok: true };
}
