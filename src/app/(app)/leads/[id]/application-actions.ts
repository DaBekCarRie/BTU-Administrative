"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { recordEvent } from "@/lib/data/people";
import type { PaymentStatus, StudyMode } from "@/lib/domain/events";
import { currentStaffId } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Enums } from "@/types/database";
import { text } from "@/lib/form";
import { createSignedUrl } from "@/lib/data/documents";

export type AppFormState = { error?: string; ok?: boolean };

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

  // path ของสลิปต้องอยู่ใต้โฟลเดอร์ของคนนี้เท่านั้น กันชี้ไปไฟล์ของคนอื่น
  const slipPath = text(formData, "slipPath");
  if (slipPath && !slipPath.startsWith(`${personId}/`)) {
    return { error: "ตำแหน่งไฟล์สลิปไม่ถูกต้อง" };
  }
  if (
    !(Constants.public.Enums.payment_status as readonly string[]).includes(
      rawStatus ?? "",
    )
  ) {
    return { error: "ต้องเลือกสถานะการเงินที่ฝ่ายการเงินแจ้งมา" };
  }

  const supabase = await createClient();
  const staffId = await currentStaffId();

  const { error } = await supabase.from("payments").insert({
    application_id: applicationId,
    amount,
    paid_at: paidAt,
    receipt_no: text(formData, "receiptNo"),
    note: text(formData, "note"),
    slip_path: slipPath,
    recorded_by: staffId,
  });
  if (error) return { error: `บันทึกการชำระไม่สำเร็จ: ${error.message}` };

  await recordEvent(personId, {
    type: "ชำระเงิน",
    occurredAt: new Date(`${paidAt}T12:00:00+07:00`).toISOString(),
    payload: {
      applicationId,
      amount,
      paymentStatus: rawStatus as PaymentStatus,
      slipPath,
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

/** ดรอป ย้ายเทอม กลับมาเรียน ลาออก — สถานะการเรียนล้วน ไม่แตะสถานะการเงิน */
export async function recordEnrollmentChange(
  _prev: AppFormState,
  formData: FormData,
): Promise<AppFormState> {
  const personId = text(formData, "personId");
  const kind = text(formData, "kind");
  if (!personId) return { error: "ไม่พบรายการ" };

  const occurredAt = new Date().toISOString();

  switch (kind) {
    case "ดรอป": {
      const reason = text(formData, "reason");
      if (!reason) return { error: "ต้องบอกเหตุผลที่ดรอป" };
      const credit = text(formData, "creditAmount");
      await recordEvent(personId, {
        type: "ดรอป",
        occurredAt,
        payload: {
          reason,
          creditAmount: credit === null ? null : Number(credit),
        },
      });
      break;
    }
    case "กลับมาเรียน":
      await recordEvent(personId, {
        type: "กลับมาเรียน",
        occurredAt,
        payload: { note: text(formData, "note") },
      });
      break;
    case "ลาออก":
      await recordEvent(personId, {
        type: "ลาออก",
        occurredAt,
        payload: { reason: text(formData, "reason") },
      });
      break;
    case "ย้ายเทอม": {
      const year = Number(text(formData, "toAcademicYear"));
      if (!Number.isInteger(year)) return { error: "ต้องระบุปีการศึกษาที่ย้ายไป" };
      await recordEvent(personId, {
        type: "ย้ายเทอม",
        occurredAt,
        payload: {
          toAcademicYear: year,
          toTerm: Number(text(formData, "toTerm")) || null,
          note: text(formData, "note"),
        },
      });
      break;
    }
    default:
      return { error: "ไม่รู้จักการเปลี่ยนสถานะนี้" };
  }

  revalidatePath(`/leads/${personId}`);
  return { ok: true };
}

/** ยืนยันว่าสถานะที่เป็นสำเนายังถูกต้อง — เปลี่ยนแค่ "รู้ล่าสุดเมื่อไหร่" (ADR-0003) */
export async function confirmStatus(
  _prev: AppFormState,
  formData: FormData,
): Promise<AppFormState> {
  const personId = text(formData, "personId");
  const dimension = text(formData, "dimension");
  if (!personId) return { error: "ไม่พบรายการ" };
  if (dimension !== "การเรียน" && dimension !== "การเงิน") {
    return { error: "ไม่รู้จักมิตินี้" };
  }

  await recordEvent(personId, {
    type: "ยืนยันสถานะ",
    occurredAt: new Date().toISOString(),
    payload: { dimension },
  });

  revalidatePath(`/leads/${personId}`);
  return { ok: true };
}

/**
 * ลิงก์เปิดสลิป — ตรวจก่อนว่าสลิปนี้เป็นของการสมัครของคนนี้จริง
 * สลิปไม่ใช่เอกสารอ่อนไหว จึงไม่เขียน document_access_log
 */
export async function openSlip(
  paymentId: string,
  personId: string,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("slip_path, applications!inner ( person_id )")
    .eq("id", paymentId)
    .eq("applications.person_id", personId)
    .maybeSingle();

  if (error) return { error: `อ่านสลิปไม่สำเร็จ: ${error.message}` };
  if (!data?.slip_path) return { error: "ไม่พบสลิป" };

  try {
    return { url: await createSignedUrl(data.slip_path) };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "เปิดสลิปไม่สำเร็จ" };
  }
}
