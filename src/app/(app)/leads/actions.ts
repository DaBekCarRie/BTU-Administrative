"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  findByPhone,
  getPersonDetails,
  mergePeople,
  recordEvent,
  type DuplicateMatch,
} from "@/lib/data/people";
import {
  CALL_OUTCOMES,
  CLOSE_REASONS,
  diffDetails,
  type PersonDetails,
  type PriorEducation,
  type StudyMode,
} from "@/lib/domain/events";
import { readNationalId, setNationalId } from "@/lib/data/national-id";
import { toDateInputValue } from "@/lib/date";
import { normalizePhone } from "@/lib/phone";
import { Constants } from "@/types/database";
import { text } from "@/lib/form";

export type LeadFormState = {
  error?: string;
  /** ต้องแยกจาก {} ให้ได้ ไม่งั้นหน้าจอแยกไม่ออกว่ายังไม่ส่ง หรือส่งสำเร็จแล้ว */
  ok?: boolean;
};

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

  await recordEvent(randomUUID(), {
    type: "ติดต่อเข้ามา",
    occurredAt: occurredAtAsInstant(text(formData, "occurredAt")),
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

  const before = await getPersonDetails(personId);
  if (!before) return { error: "ไม่พบคนที่จะแก้" };

  // ส่งเฉพาะช่องที่เปลี่ยน ไทม์ไลน์จะได้บอกว่า "แก้อะไร" ไม่ใช่ "แก้ 11 ช่อง" ทุกครั้ง (story 58)
  const patch = diffDetails(before, details);
  if (Object.keys(patch).length > 0) {
    await recordEvent(personId, {
      type: "แก้ไขข้อมูล",
      occurredAt: new Date().toISOString(),
      payload: patch,
    });
  }

  revalidatePath("/leads");
  redirect("/leads");
}

/**
 * แปลงวันที่จากฟอร์มเป็นเวลาจริง
 * ถ้าเป็นวันนี้ใช้เวลาปัจจุบัน — ตั้งเป็นเที่ยงวันจะกลายเป็นเวลาอนาคตเมื่อบันทึกตอนเช้า
 * แล้วรายการจะเรียงขึ้นเหนือสิ่งที่เพิ่งเกิดจริง ๆ
 */
function occurredAtAsInstant(date: string | null): string {
  if (!date) return new Date().toISOString();
  if (date === toDateInputValue()) return new Date().toISOString();
  return new Date(`${date}T12:00:00+07:00`).toISOString();
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
    occurredAt: occurredAtAsInstant(occurredAtDate),
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

/** ตรวจว่าเบอร์นี้มีคนใช้อยู่แล้วไหม — เตือนให้คนตัดสิน ไม่บล็อก */
export async function checkDuplicatePhone(
  phone: string,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  return findByPhone(phone, excludeId);
}

/** รวมสองรายการที่เป็นคนเดียวกัน — หัวหน้าทีมเท่านั้น */
export async function mergeLeads(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const survivorId = text(formData, "survivorId");
  const mergedId = text(formData, "mergedId");
  if (!survivorId || !mergedId) return { error: "ต้องระบุทั้งสองรายการ" };

  try {
    await mergePeople(survivorId, mergedId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "รวมข้อมูลไม่สำเร็จ" };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${survivorId}`);
  return { ok: true };
}

/** บันทึกเลขบัตรประชาชน — เข้ารหัสที่ฐานข้อมูล */
export async function saveNationalId(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const personId = text(formData, "personId");
  if (!personId) return { error: "ไม่พบรายการ" };

  try {
    await setNationalId(personId, String(formData.get("nationalId") ?? ""));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "บันทึกเลขบัตรไม่สำเร็จ",
    };
  }

  revalidatePath(`/leads/${personId}`);
  return { ok: true };
}

/** เปิดดูเลขบัตรประชาชนเต็ม — ฐานข้อมูลเขียน log ให้ทุกครั้งโดยเลี่ยงไม่ได้ */
export async function revealNationalId(
  personId: string,
): Promise<{ value?: string | null; error?: string }> {
  try {
    return { value: await readNationalId(personId) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "เปิดดูไม่สำเร็จ",
    };
  }
}

/** เปลี่ยนผู้ดูแลพร้อมกันหลายรายการ */
export async function bulkChangeOwner(
  personIds: string[],
  newOwnerId: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!personIds.length) return { error: "ไม่มีรายการที่เลือก" };
  if (!newOwnerId) return { error: "กรุณาเลือกผู้ดูแลใหม่" };

  try {
    for (const personId of personIds) {
      await recordEvent(personId, {
        type: "แก้ไขข้อมูล",
        occurredAt: new Date().toISOString(),
        payload: { ownerId: newOwnerId },
      });
    }

    revalidatePath("/leads");
    revalidatePath("/queue");
    return { ok: true };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "เปลี่ยนผู้ดูแลไม่สำเร็จ",
    };
  }
}

