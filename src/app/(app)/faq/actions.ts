"use server";

import { revalidatePath } from "next/cache";

import { currentStaffId } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Enums } from "@/types/database";
import { text } from "@/lib/form";

export type AnswerFormState = { error?: string; ok?: boolean };

export async function createAnswer(
  _prev: AnswerFormState,
  formData: FormData,
): Promise<AnswerFormState> {
  const question = text(formData, "question");
  const answer = text(formData, "answer");
  if (!question || !answer) return { error: "ต้องกรอกทั้งคำถามและคำตอบ" };

  const raw = text(formData, "visibility") ?? "";
  const visibility = (
    Constants.public.Enums.answer_visibility as readonly string[]
  ).includes(raw)
    ? (raw as Enums<"answer_visibility">)
    : "ตอบผู้สนใจได้";

  const supabase = await createClient();
  const staffId = await currentStaffId();

  const { error } = await supabase.from("answers").insert({
    question,
    answer,
    visibility,
    source: text(formData, "source"),
    // คำตอบที่เพิ่งเขียนถือว่ายืนยันแล้ว ณ วันนี้
    confirmed_at: new Date().toISOString(),
    confirmed_by: staffId,
  });

  if (error) return { error: `บันทึกไม่สำเร็จ: ${error.message}` };

  revalidatePath("/faq");
  return { ok: true };
}

/** กดยืนยันว่าคำตอบนี้ยังถูกต้อง — อัปเดตวันที่และชื่อผู้ยืนยันโดยไม่ต้องพิมพ์ใหม่ */
export async function confirmAnswer(
  _prev: AnswerFormState,
  formData: FormData,
): Promise<AnswerFormState> {
  const id = text(formData, "id");
  if (!id) return { error: "ไม่พบคำตอบที่จะยืนยัน" };

  const supabase = await createClient();
  const staffId = await currentStaffId();

  const { error } = await supabase
    .from("answers")
    .update({
      confirmed_at: new Date().toISOString(),
      confirmed_by: staffId,
    })
    .eq("id", id);

  if (error) return { error: `ยืนยันไม่สำเร็จ: ${error.message}` };

  revalidatePath("/faq");
  return { ok: true };
}
