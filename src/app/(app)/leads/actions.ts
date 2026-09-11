"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordEvent } from "@/lib/data/people";
import {
  CALL_OUTCOMES,
  CLOSE_REASONS,
  type PersonDetails,
  type PriorEducation,
  type StudyMode,
} from "@/lib/domain/events";
import { normalizePhone } from "@/lib/phone";
import { Constants } from "@/types/database";

export type LeadFormState = {
  error?: string;
  /** ต้องแยกจาก {} ให้ได้ ไม่งั้นหน้าจอแยกไม่ออกว่ายังไม่ส่ง หรือส่งสำเร็จแล้ว */
  ok?: boolean;
};

function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function optionOf<T extends string>(
  allowed: readonly T[],
  value: string | null,
): T | null {
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function readDetails(formData: FormData): PersonDetails | { error: string } {
  const fullName = text(formData, "fullName");
  if (!fullName) return { error: "กรุณากรอกชื่อ" };

  const rawPhone = text(formData, "phone");
  const phone = normalizePhone(rawPhone);
  if (rawPhone && !phone) {
    return { error: "เบอร์โทรไม่ถูกต้อง ต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0" };
  }

  return {
    fullName,
    nickname: text(formData, "nickname"),
    phone,
    lineId: text(formData, "lineId"),
    facebookName: text(formData, "facebookName"),
    studyMode: optionOf<StudyMode>(
      Constants.public.Enums.study_mode,
      text(formData, "studyMode"),
    ),
    facultyId: text(formData, "facultyId"),
    programId: text(formData, "programId"),
    priorEducation: optionOf<PriorEducation>(
      Constants.public.Enums.prior_education,
      text(formData, "priorEducation"),
    ),
    ownerId: text(formData, "ownerId"),
    note: text(formData, "note"),
  };
}

/** เพิ่มผู้สนใจใหม่ = เหตุการณ์ `ติดต่อเข้ามา` */
export async function createLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const details = readDetails(formData);
  if ("error" in details) return details;

  const occurredAt = text(formData, "occurredAt");

  await recordEvent(randomUUID(), {
    type: "ติดต่อเข้ามา",
    occurredAt: occurredAt
      ? new Date(occurredAt).toISOString()
      : new Date().toISOString(),
    payload: { ...details, source: text(formData, "source") },
  });

  revalidatePath("/leads");
  redirect("/leads");
}

/** แก้ข้อมูลติดต่อ = เหตุการณ์ `แก้ไขข้อมูล` ไม่ใช่การเขียนทับ */
export async function editLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const personId = text(formData, "personId");
  if (!personId) return { error: "ไม่พบรหัสของคนที่จะแก้" };

  const details = readDetails(formData);
  if ("error" in details) return details;

  await recordEvent(personId, {
    type: "แก้ไขข้อมูล",
    occurredAt: new Date().toISOString(),
    payload: details,
  });

  revalidatePath("/leads");
  redirect("/leads");
}

/** บันทึกผลการโทร = เหตุการณ์ `โทรตาม` */
export async function logCall(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const personId = text(formData, "personId");
  if (!personId) return { error: "ไม่พบรหัสของคนที่จะบันทึก" };

  const outcome = optionOf(CALL_OUTCOMES, text(formData, "outcome"));
  if (!outcome) return { error: "กรุณาเลือกผลการโทร" };

  const occurredAtDate = text(formData, "occurredAt");
  const nextCallDate = text(formData, "nextCallAt");

  await recordEvent(personId, {
    type: "โทรตาม",
    occurredAt: occurredAtDate
      ? new Date(`${occurredAtDate}T12:00:00+07:00`).toISOString()
      : new Date().toISOString(),
    payload: {
      outcome,
      note: text(formData, "note"),
      nextCallAt: nextCallDate
        ? new Date(`${nextCallDate}T09:00:00+07:00`).toISOString()
        : null,
    },
  });

  revalidatePath(`/leads/${personId}`);
  revalidatePath("/leads");
  revalidatePath("/queue");
  return { ok: true };
}

/** ปิดเคส = เหตุการณ์ `ปิดเคส` คนนั้นจะไม่โผล่ในคิวโทรอีก */
export async function closeLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const personId = text(formData, "personId");
  if (!personId) return { error: "ไม่พบรหัสของคนที่จะปิดเคส" };

  const reason = optionOf(CLOSE_REASONS, text(formData, "reason"));
  if (!reason) return { error: "กรุณาเลือกเหตุผลที่ปิดเคส" };

  await recordEvent(personId, {
    type: "ปิดเคส",
    occurredAt: new Date().toISOString(),
    payload: { reason, note: text(formData, "note") },
  });

  revalidatePath(`/leads/${personId}`);
  revalidatePath("/leads");
  revalidatePath("/queue");
  return { ok: true };
}
