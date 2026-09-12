"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { recordEvent } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/form";

export type ExamFormState = { error?: string; ok?: boolean };

export async function requestExamCenter(
  _prev: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  const personId = text(formData, "personId");
  const centerName = text(formData, "centerName");
  const academicYear = Number(text(formData, "academicYear"));

  if (!personId) return { error: "ไม่พบรายการ" };
  if (!centerName) return { error: "ต้องระบุศูนย์สอบ" };
  if (!Number.isInteger(academicYear)) {
    return { error: "ปีการศึกษาต้องเป็น พ.ศ. เช่น 2569" };
  }

  const supabase = await createClient();
  const requestId = randomUUID();

  const { error } = await supabase.from("exam_center_requests").insert({
    id: requestId,
    person_id: personId,
    academic_year: academicYear,
    center_name: centerName,
    status: "ขอแล้ว",
  });
  if (error) return { error: `บันทึกคำขอไม่สำเร็จ: ${error.message}` };

  await recordEvent(personId, {
    type: "ขอศูนย์สอบพิเศษ",
    occurredAt: new Date().toISOString(),
    payload: { requestId, academicYear, centerName },
  });

  revalidatePath(`/leads/${personId}`);
  revalidatePath("/exams");
  return { ok: true };
}

/** ถอนคำขอ — ไม่ลบทิ้ง เพื่อให้ยังเห็นในไทม์ไลน์ว่าเคยขอและถอนเมื่อไหร่ */
export async function withdrawExamRequest(
  _prev: ExamFormState,
  formData: FormData,
): Promise<ExamFormState> {
  const personId = text(formData, "personId");
  const requestId = text(formData, "requestId");
  const centerName = text(formData, "centerName");

  if (!personId || !requestId || !centerName) return { error: "ไม่พบคำขอ" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("exam_center_requests")
    .update({ status: "ถอนแล้ว" })
    .eq("id", requestId);
  if (error) return { error: `ถอนคำขอไม่สำเร็จ: ${error.message}` };

  await recordEvent(personId, {
    type: "ถอนคำขอศูนย์สอบ",
    occurredAt: new Date().toISOString(),
    payload: { requestId, centerName },
  });

  revalidatePath(`/leads/${personId}`);
  revalidatePath("/exams");
  return { ok: true };
}
