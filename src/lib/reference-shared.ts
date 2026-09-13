import { Constants, type Enums } from "@/types/database";
import { firstParam } from "@/lib/search-params";

/** หมวดของเอกสารอ้างอิง — ค่าคงที่ ห้ามพิมพ์เอง (CLAUDE.md กฎข้อ 4) */
export const REFERENCE_CATEGORIES = Constants.public.Enums.reference_category;
export type ReferenceCategory = Enums<"reference_category">;

/** ชนิดไฟล์ที่ bucket `reference` รับ และนามสกุลที่ใช้ตั้งชื่อใน storage */
export const REFERENCE_MIME_EXTENSION: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export type ReferenceInput = {
  category: ReferenceCategory;
  title: string;
  academicYear: number | null;
};

const TITLE_MAX = 200;

/** ช่วงปี พ.ศ. ที่ยอมรับ — ตรงกับ check constraint ของตาราง */
const ACADEMIC_YEAR_MIN = 2500;
const ACADEMIC_YEAR_MAX = 2700;

/** ตรวจค่าที่กรอก ใช้ทั้งฝั่งฟอร์มและฝั่งเซิร์ฟเวอร์ */
export function parseReferenceInput(raw: {
  category?: string | null;
  title?: string | null;
  academicYear?: string | null;
}): { value: ReferenceInput } | { error: string } {
  const category = (raw.category ?? "").trim();
  if (!(REFERENCE_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "กรุณาเลือกหมวด" };
  }

  const title = (raw.title ?? "").replace(/\s+/g, " ").trim();
  if (!title) return { error: "กรุณากรอกชื่อเรื่อง" };
  if (title.length > TITLE_MAX) return { error: `ชื่อเรื่องยาวได้ไม่เกิน ${TITLE_MAX} ตัวอักษร` };

  const yearText = (raw.academicYear ?? "").trim();
  let academicYear: number | null = null;
  if (yearText) {
    academicYear = Number(yearText);
    if (!Number.isInteger(academicYear) || academicYear < ACADEMIC_YEAR_MIN || academicYear > ACADEMIC_YEAR_MAX) {
      return { error: "ปีการศึกษาต้องเป็นปี พ.ศ. เช่น 2569" };
    }
  }

  return { value: { category: category as ReferenceCategory, title, academicYear } };
}

/** path ใน storage ตั้งจาก id ล้วน — ชื่อไฟล์เดิมเป็นภาษาไทยได้ แต่ Supabase ไม่รับ */
export function referenceStoragePath(
  documentId: string,
  fileId: string,
  mimeType: string,
): string | null {
  const extension = REFERENCE_MIME_EXTENSION[mimeType];
  return extension ? `${documentId}/${fileId}.${extension}` : null;
}

const OWNED_PATH = /^([0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

/** กันไม่ให้ผูกไฟล์ของรายการอื่นหรือ path แปลก ๆ เข้ากับรายการนี้ */
export function isOwnedStoragePath(documentId: string, storagePath: string): boolean {
  const match = storagePath.match(OWNED_PATH);
  return !!match && match[1] === documentId;
}

export type ReferenceFilters = {
  q: string;
  category: ReferenceCategory | "";
  /** ปี พ.ศ. · "none" = ไม่ผูกกับปี · "" = ทุกปี */
  year: string;
};

const SEARCH_MAX = 100;

/** แปลง query string เป็นตัวกรอง — ค่าที่ไม่รู้จักถูกทิ้ง ไม่ใช่ส่งต่อไปที่ฐานข้อมูล */
export function parseReferenceFilters(
  params: Record<string, string | string[] | undefined>,
): ReferenceFilters {
  const category = firstParam(params.category);
  const year = firstParam(params.year);
  const yearNumber = Number(year);

  return {
    q: firstParam(params.q).slice(0, SEARCH_MAX),
    category: (REFERENCE_CATEGORIES as readonly string[]).includes(category)
      ? (category as ReferenceCategory)
      : "",
    year:
      year === "none" ||
      (Number.isInteger(yearNumber) && yearNumber >= ACADEMIC_YEAR_MIN && yearNumber <= ACADEMIC_YEAR_MAX)
        ? year
        : "",
  };
}

/** กันไม่ให้ % และ _ ในคำค้นกลายเป็น wildcard ของ ILIKE */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
