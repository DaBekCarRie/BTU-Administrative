"use server";

import { revalidatePath } from "next/cache";

import { createSignedUrl } from "@/lib/data/documents";
import { currentStaffId } from "@/lib/data/staff";
import { createClient } from "@/lib/supabase/server";
import { Constants, type Enums } from "@/types/database";

export type DocFormState = { error?: string; ok?: boolean };

function text(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

/** บันทึกว่าอัปโหลดไฟล์ขึ้น storage แล้ว — ตัวไฟล์ถูกส่งจากเบราว์เซอร์หลังย่อขนาด */
export async function recordUpload(
  personId: string,
  docType: string,
  storagePath: string,
): Promise<DocFormState> {
  if (!(Constants.public.Enums.doc_type as readonly string[]).includes(docType)) {
    return { error: "ประเภทเอกสารไม่ถูกต้อง" };
  }

  const supabase = await createClient();
  const staffId = await currentStaffId();

  const { error } = await supabase.from("documents").upsert(
    {
      person_id: personId,
      doc_type: docType as Enums<"doc_type">,
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

  const { error } = await supabase
    .from("documents")
    .update({
      status,
      reject_reason: status === "ไม่ผ่าน" ? reason : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: staffId,
    })
    .eq("id", id);

  if (error) return { error: `บันทึกผลตรวจไม่สำเร็จ: ${error.message}` };

  revalidatePath(`/leads/${personId}`);
  revalidatePath("/documents");
  return { ok: true };
}

/** ขอลิงก์เปิดเอกสาร — เอกสารอ่อนไหวจะถูกบันทึก log ในใบ 09 */
export async function openDocument(
  documentId: string,
  personId: string,
  storagePath: string,
  sensitive: boolean,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();

  if (sensitive) {
    await supabase.from("document_access_log").insert({
      person_id: personId,
      document_id: documentId,
      what: "เปิดดูเอกสารอ่อนไหว",
      viewed_by: await currentStaffId(),
    });
  }

  try {
    return { url: await createSignedUrl(storagePath) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "เปิดเอกสารไม่สำเร็จ",
    };
  }
}
