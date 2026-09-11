import { Constants, type Enums } from "@/types/database";

export const DOC_TYPES = Constants.public.Enums.doc_type;
export type DocType = Enums<"doc_type">;

/**
 * Supabase Storage ไม่รับอักษรไทยในชื่อ path (ตอบ 400)
 * จึงต้องมี slug อังกฤษสำหรับตั้งชื่อไฟล์ ส่วนที่แสดงบนหน้าจอยังใช้ภาษาไทยตามเดิม
 */
export const DOC_TYPE_SLUG: Record<DocType, string> = {
  รูปถ่าย: "photo",
  วุฒิการศึกษา: "transcript",
  สำเนาบัตรประชาชน: "national-id",
  สำเนาทะเบียนบ้าน: "house-registration",
};

/** เอกสารที่ต้องกดเปิดและถูกบันทึก log ทุกครั้ง */
export const SENSITIVE_DOC_TYPES: ReadonlySet<DocType> = new Set([
  "สำเนาบัตรประชาชน",
  "สำเนาทะเบียนบ้าน",
]);
