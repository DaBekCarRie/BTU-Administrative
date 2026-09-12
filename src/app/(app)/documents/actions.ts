"use server";

import { revalidatePath } from "next/cache";

import { createSignedUrl } from "@/lib/data/documents";
import { recordEvent } from "@/lib/data/people";
import { currentStaffId } from "@/lib/data/staff";
import { SENSITIVE_DOC_TYPES, type DocType } from "@/lib/documents-shared";
import { text } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { Constants } from "@/types/database";

export type DocFormState = { error?: string; ok?: boolean };

function isDocType(value: string): value is DocType {
  return (Constants.public.Enums.doc_type as readonly string[]).includes(value);
}

/**
 * บันทึกว่าอัปโหลดไฟล์ขึ้น storage แล้ว — ตัวไฟล์ถูกส่งจากเบราว์เซอร์หลังย่อขนาด
 *
 * ตาราง documents คือที่อยู่ของเอกสาร ส่วนเหตุการณ์ `ส่งเอกสาร` มีไว้ให้โผล่บนไทม์ไลน์
 * และเลื่อน last_event_at ให้คนนี้ไม่ถูกนับว่าค้าง (story 40)
 */
export async function recordUpload(
  personId: string,
  docType: string,
  storagePath: string,
): Promise<DocFormState> {
  if (!isDocType(docType)) return { error: "ประเภทเอกสารไม่ถูกต้อง" };

  const supabase = await createClient();
  const staffId = await currentStaffId();

  const { error } = await supabase.from("documents").upsert(
    {
      person_id: personId,
      doc_type: docType,
      storage_path: storagePath,
      status: "ส่งแล้ว",
      reject_reason: null,
      reviewed_at: null,
      reviewed_by: null,
      uploaded_by: staffId,
    },
    { onConflict: "person_id,doc_type" },
  );
  if (error) return { error: `บันทึกเอกสารไม่สำเร็จ: ${error.message}` };

  try {
    await recordEvent(personId, {
      type: "ส่งเอกสาร",
      occurredAt: new Date().toISOString(),
      payload: { docType },
    });
  } catch (cause) {
    // เอกสารบันทึกแล้ว แค่ไม่ขึ้นไทม์ไลน์ — บอกให้รู้ ไม่ทำเป็นเงียบ
    return { error: `บันทึกเอกสารแล้ว แต่ลงไทม์ไลน์ไม่สำเร็จ: ${message(cause)}` };
  }

  revalidatePath(`/leads/${personId}`);
  revalidatePath("/documents");
  return { ok: true };
}

/** ตรวจเอกสาร ผ่านหรือไม่ผ่าน — ไม่ผ่านต้องบอกเหตุผล */
export async function reviewDocument(
  _prev: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const id = text(formData, "id");
  const personId = text(formData, "personId");
  const status = text(formData, "status");
  const reason = text(formData, "rejectReason");

  if (!id || !personId) return { error: "ไม่พบเอกสารที่จะตรวจ" };
  if (status !== "ผ่าน" && status !== "ไม่ผ่าน") {
    return { error: "สถานะไม่ถูกต้อง" };
  }
  if (status === "ไม่ผ่าน" && !reason) {
    return { error: "ไม่ผ่านต้องบอกเหตุผล เพื่อให้คนรับงานต่อรู้ว่าต้องขอใหม่เพราะอะไร" };
  }

  const supabase = await createClient();
  const staffId = await currentStaffId();

  const { data, error } = await supabase
    .from("documents")
    .update({
      status,
      reject_reason: status === "ไม่ผ่าน" ? reason : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: staffId,
    })
    .eq("id", id)
    .eq("person_id", personId)
    .select("doc_type")
    .maybeSingle();

  if (error) return { error: `บันทึกผลตรวจไม่สำเร็จ: ${error.message}` };
  if (!data) return { error: "ไม่พบเอกสารที่จะตรวจ" };

  try {
    await recordEvent(personId, {
      type: "ตรวจเอกสาร",
      occurredAt: new Date().toISOString(),
      payload: {
        docType: data.doc_type,
        status,
        rejectReason: status === "ไม่ผ่าน" ? reason : null,
      },
    });
  } catch (cause) {
    return { error: `บันทึกผลตรวจแล้ว แต่ลงไทม์ไลน์ไม่สำเร็จ: ${message(cause)}` };
  }

  revalidatePath(`/leads/${personId}`);
  revalidatePath("/documents");
  return { ok: true };
}

/**
 * ขอลิงก์เปิดเอกสาร
 *
 * ทุกอย่างอ่านจากแถวในฐานข้อมูล ไม่รับ path หรือธงอ่อนไหวจากผู้เรียก —
 * เดิมผู้เรียกส่ง `sensitive: false` มาก็ได้ลิงก์โดยไม่มี log และส่ง path อะไรก็ได้
 * ถ้าเขียน log ไม่สำเร็จ ต้องไม่ให้ลิงก์ (fail closed) เพราะ log คือเงื่อนไขของการเปิดดู
 */
export async function openDocument(
  documentId: string,
  personId: string,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();

  const { data: doc, error: readError } = await supabase
    .from("documents")
    .select("doc_type, storage_path")
    .eq("id", documentId)
    .eq("person_id", personId)
    .maybeSingle();

  if (readError) return { error: `อ่านเอกสารไม่สำเร็จ: ${readError.message}` };
  if (!doc) return { error: "ไม่พบเอกสาร" };

  if (SENSITIVE_DOC_TYPES.has(doc.doc_type)) {
    const { error: logError } = await supabase.from("document_access_log").insert({
      person_id: personId,
      document_id: documentId,
      what: "เปิดดูเอกสารอ่อนไหว",
      viewed_by: await currentStaffId(),
    });
    if (logError) {
      return { error: `บันทึกการเปิดดูไม่สำเร็จ จึงยังเปิดให้ไม่ได้: ${logError.message}` };
    }
  }

  try {
    return { url: await createSignedUrl(doc.storage_path) };
  } catch (cause) {
    return { error: message(cause) };
  }
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : "เกิดข้อผิดพลาดที่ไม่รู้สาเหตุ";
}
