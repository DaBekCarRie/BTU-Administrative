"use server";

import { revalidatePath } from "next/cache";

import { createReferenceFileUrl } from "@/lib/data/reference-documents";
import { currentStaffId, isTeamLead } from "@/lib/data/staff";
import {
  isOwnedStoragePath,
  parseReferenceInput,
  REFERENCE_MIME_EXTENSION,
} from "@/lib/reference-shared";
import { createClient } from "@/lib/supabase/server";

type Result = { ok?: boolean; id?: string; error?: string };

type RawInput = { category: string; title: string; academicYear: string };

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/** เพิ่มรายการเอกสารอ้างอิง — ไฟล์ตามมาทีหลังจากเบราว์เซอร์ทีละไฟล์ */
export async function createReferenceDocument(raw: RawInput): Promise<Result> {
  const parsed = parseReferenceInput(raw);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reference_documents")
    .insert({
      category: parsed.value.category,
      title: parsed.value.title,
      academic_year: parsed.value.academicYear,
      uploaded_by: await currentStaffId(),
    })
    .select("id")
    .single();

  if (error) return { error: `บันทึกเอกสารอ้างอิงไม่สำเร็จ: ${error.message}` };
  revalidatePath("/reference");
  return { ok: true, id: data.id };
}

export async function updateReferenceDocument(id: string, raw: RawInput): Promise<Result> {
  const parsed = parseReferenceInput(raw);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reference_documents")
    .update({
      category: parsed.value.category,
      title: parsed.value.title,
      academic_year: parsed.value.academicYear,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `แก้เอกสารอ้างอิงไม่สำเร็จ: ${error.message}` };
  if (!data) return { error: "ไม่พบเอกสารอ้างอิง" };
  revalidatePath("/reference");
  return { ok: true, id };
}

/** บันทึกว่าไฟล์ขึ้น storage แล้ว — ตัวไฟล์ถูกส่งจากเบราว์เซอร์หลังย่อขนาด */
export async function recordReferenceFile(
  documentId: string,
  file: { storagePath: string; fileName: string; mimeType: string; sizeBytes: number },
): Promise<Result> {
  if (!isOwnedStoragePath(documentId, file.storagePath)) {
    return { error: "ที่อยู่ไฟล์ไม่ถูกต้อง" };
  }
  if (!REFERENCE_MIME_EXTENSION[file.mimeType]) {
    return { error: "รับเฉพาะรูปภาพและ PDF" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reference_document_files").insert({
    reference_document_id: documentId,
    storage_path: file.storagePath,
    file_name: file.fileName.slice(0, 255) || "ไฟล์",
    mime_type: file.mimeType,
    size_bytes: Math.max(0, Math.round(file.sizeBytes)),
    uploaded_by: await currentStaffId(),
  });
  if (error) return { error: `บันทึกไฟล์ไม่สำเร็จ: ${error.message}` };

  // ให้รายการที่เพิ่งแนบไฟล์ขึ้นไปอยู่บนสุด
  await supabase.from("reference_documents").update({ updated_at: new Date().toISOString() }).eq("id", documentId);

  revalidatePath("/reference");
  return { ok: true };
}

export async function openReferenceFile(fileId: string): Promise<{ url?: string; error?: string }> {
  try {
    return { url: await createReferenceFileUrl(fileId) };
  } catch (cause) {
    return { error: message(cause) };
  }
}

/**
 * ลบเอกสารอ้างอิงพร้อมไฟล์ — หัวหน้าทีมเท่านั้น ด่านจริงคือ policy ของฐานข้อมูลและ bucket
 *
 * ลบไฟล์ใน storage ก่อน แล้วค่อยลบแถว: ถ้าลบไฟล์ไม่ได้ต้องหยุด ไม่งั้นแถวหายแต่ไฟล์ค้างเป็นกำพร้า
 * Supabase ไม่ error เมื่อ RLS กันการลบ แต่คืนรายการว่าง — จึงต้องนับว่าลบได้ครบจริง
 */
export async function deleteReferenceDocument(id: string): Promise<Result> {
  // บอกเหตุผลให้ตรงก่อนเริ่ม — policy ยังกันซ้ำอีกชั้นถ้ามีคนเรียกตรง
  if (!(await isTeamLead())) return { error: "ลบได้เฉพาะหัวหน้าทีม" };

  const supabase = await createClient();

  const { data: files, error: readError } = await supabase
    .from("reference_document_files")
    .select("storage_path")
    .eq("reference_document_id", id);
  if (readError) return { error: `อ่านไฟล์ของรายการไม่สำเร็จ: ${readError.message}` };

  const paths = (files ?? []).map((file) => file.storage_path);
  if (paths.length > 0) {
    const { data: removed, error: removeError } = await supabase.storage.from("reference").remove(paths);
    if (removeError) return { error: `ลบไฟล์ไม่สำเร็จ: ${removeError.message}` };
    if ((removed ?? []).length !== paths.length) {
      // ไฟล์บางไฟล์อาจหายจาก storage ไปก่อนแล้ว — ไม่ลบแถว ให้คนดูว่าเกิดอะไรขึ้น
      return { error: `ลบไฟล์ได้ ${(removed ?? []).length} จาก ${paths.length} ไฟล์ จึงยังไม่ลบรายการ` };
    }
  }

  const { data: deleted, error } = await supabase
    .from("reference_documents")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return { error: `ลบเอกสารอ้างอิงไม่สำเร็จ: ${error.message}` };
  if ((deleted ?? []).length === 0) return { error: "ลบได้เฉพาะหัวหน้าทีม" };

  revalidatePath("/reference");
  return { ok: true };
}
