import "server-only";

import {
  escapeLikePattern,
  type ReferenceCategory,
  type ReferenceFilters,
} from "@/lib/reference-shared";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 60;

export type ReferenceFile = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: string;
};

export type ReferenceItem = {
  id: string;
  category: ReferenceCategory;
  title: string;
  /** พ.ศ. — ว่างถ้าไม่ผูกกับปี */
  academicYear: number | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
  files: ReferenceFile[];
};

/** เอกสารอ้างอิง ล่าสุดก่อน กรองตามคำค้น หมวด และปี — อ่านได้เฉพาะเจ้าหน้าที่ (RLS) */
export async function listReferenceDocuments(filters: ReferenceFilters): Promise<ReferenceItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("reference_documents")
    .select(
      `id, category, title, academic_year, created_at, updated_at,
       staff:uploaded_by ( display_name ),
       reference_document_files ( id, file_name, mime_type, size_bytes, created_at )`,
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: true, referencedTable: "reference_document_files" });

  // พิมพ์ไม่ครบก็เจอ — ค้นเป็นส่วนหนึ่งของชื่อเรื่อง
  if (filters.q) query = query.ilike("title", `%${escapeLikePattern(filters.q)}%`);
  if (filters.category) query = query.eq("category", filters.category as ReferenceCategory);
  if (filters.year === "none") query = query.is("academic_year", null);
  else if (filters.year) query = query.eq("academic_year", Number(filters.year));

  const { data, error } = await query;

  if (error) throw new Error(`อ่านเอกสารอ้างอิงไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    academicYear: row.academic_year,
    uploadedByName: row.staff?.display_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files: (row.reference_document_files ?? []).map((file) => ({
      id: file.id,
      fileName: file.file_name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      createdAt: file.created_at,
    })),
  }));
}

/**
 * ลิงก์เปิดไฟล์อายุสั้น — อ่าน path จากแถวในฐานข้อมูลเอง ไม่รับ path จากเบราว์เซอร์
 * ไม่เขียนบันทึกการเปิดดู เพราะเอกสารอ้างอิงไม่ใช่ข้อมูลส่วนบุคคล
 */
export async function createReferenceFileUrl(fileId: string): Promise<string> {
  const supabase = await createClient();
  const { data: file, error } = await supabase
    .from("reference_document_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();
  if (error) throw new Error(`อ่านไฟล์ไม่สำเร็จ: ${error.message}`);
  if (!file) throw new Error("ไม่พบไฟล์");

  const { data, error: signError } = await supabase.storage
    .from("reference")
    .createSignedUrl(file.storage_path, SIGNED_URL_SECONDS);
  if (signError || !data) {
    throw new Error(`สร้างลิงก์เปิดไฟล์ไม่สำเร็จ: ${signError?.message ?? ""}`);
  }
  return data.signedUrl;
}
