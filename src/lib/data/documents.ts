import "server-only";

import {
  DOC_TYPES,
  SENSITIVE_DOC_TYPES,
  type DocType,
} from "@/lib/documents-shared";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export {
  DOC_TYPES,
  DOC_TYPE_SLUG,
  SENSITIVE_DOC_TYPES,
} from "@/lib/documents-shared";
export type { DocType } from "@/lib/documents-shared";

/** ลิงก์เปิดเอกสารมีอายุสั้น สร้างจากฝั่งเซิร์ฟเวอร์เท่านั้น */
const SIGNED_URL_SECONDS = 60;

export type DocumentItem = {
  id: string;
  docType: DocType;
  status: Enums<"doc_status">;
  rejectReason: string | null;
  storagePath: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  isSensitive: boolean;
};

export type DocumentChecklist = {
  items: DocumentItem[];
  missing: DocType[];
  completed: number;
  total: number;
};

export async function getChecklist(personId: string): Promise<DocumentChecklist> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("id, doc_type, status, reject_reason, storage_path, reviewed_at, staff:reviewed_by ( display_name ), created_at")
    .eq("person_id", personId);

  if (error) throw new Error(`อ่านเอกสารไม่สำเร็จ: ${error.message}`);

  const items: DocumentItem[] = (data ?? []).map((row) => ({
    id: row.id,
    docType: row.doc_type,
    status: row.status,
    rejectReason: row.reject_reason,
    storagePath: row.storage_path,
    reviewedByName: row.staff?.display_name ?? null,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    isSensitive: SENSITIVE_DOC_TYPES.has(row.doc_type),
  }));

  const present = new Set(items.map((item) => item.docType));

  return {
    items: [...items].sort(
      (a, b) => DOC_TYPES.indexOf(a.docType) - DOC_TYPES.indexOf(b.docType),
    ),
    missing: DOC_TYPES.filter((type) => !present.has(type)),
    // นับเฉพาะที่ตรวจผ่านแล้ว — ส่งมาแต่ยังไม่ตรวจไม่ถือว่าครบ
    completed: items.filter((item) => item.status === "ผ่าน").length,
    total: DOC_TYPES.length,
  };
}

/** ลิงก์เปิดเอกสาร อายุสั้น ใช้ครั้งเดียวจบ */
export async function createSignedUrl(storagePath: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, SIGNED_URL_SECONDS);

  if (error || !data) {
    throw new Error(`สร้างลิงก์เปิดเอกสารไม่สำเร็จ: ${error?.message ?? ""}`);
  }
  return data.signedUrl;
}

export type IncompletePerson = {
  id: string;
  fullName: string;
  passed: number;
  uploaded: number;
};

export type DeskDoc = {
  id?: string;
  docType: DocType;
  status: "ผ่าน" | "ส่งแล้ว" | "ไม่ผ่าน" | "ยังไม่ส่ง";
  rejectReason?: string | null;
  storagePath?: string;
  reviewedAt?: string | null;
  reviewedByName?: string | null;
  createdAt?: string;
  isSensitive: boolean;
};

export type DeskSubmission = {
  id: string;
  fullName: string;
  programName: string | null;
  facultyName: string | null;
  studyMode: string | null;
  ownerName: string | null;
  uploadedAt: string;
  passed: number;
  uploaded: number;
  docs: Record<DocType, DeskDoc>;
};

/** รายการผู้ยื่นเอกสารสำหรับโต๊ะตรวจเอกสาร Desk View */
export async function listDeskSubmissions(limit = 100): Promise<DeskSubmission[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("people")
    .select(
      `id, full_name, study_mode, last_event_at,
       programs ( name, faculties ( name ) ),
       staff ( display_name ),
       documents ( id, doc_type, status, reject_reason, storage_path, reviewed_at, created_at, staff:reviewed_by ( display_name ) )`
    )
    .order("last_event_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`อ่านรายการเอกสารไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => {
    const docsMap = {} as Record<DocType, DeskDoc>;
    for (const type of DOC_TYPES) {
      const found = (row.documents ?? []).find((d) => d.doc_type === type);
      if (found) {
        docsMap[type] = {
          id: found.id,
          docType: type,
          status: found.status as "ผ่าน" | "ส่งแล้ว" | "ไม่ผ่าน",
          rejectReason: found.reject_reason,
          storagePath: found.storage_path,
          reviewedAt: found.reviewed_at,
          reviewedByName: found.staff?.display_name ?? null,
          createdAt: found.created_at,
          isSensitive: SENSITIVE_DOC_TYPES.has(type),
        };
      } else {
        docsMap[type] = {
          docType: type,
          status: "ยังไม่ส่ง",
          isSensitive: SENSITIVE_DOC_TYPES.has(type),
        };
      }
    }

    const passedCount = Object.values(docsMap).filter((d) => d.status === "ผ่าน").length;
    const uploadedCount = (row.documents ?? []).length;

    return {
      id: row.id,
      fullName: row.full_name,
      programName: row.programs?.name ?? null,
      facultyName: row.programs?.faculties?.name ?? null,
      studyMode: row.study_mode,
      ownerName: row.staff?.display_name ?? null,
      uploadedAt: row.last_event_at ?? new Date().toISOString(),
      passed: passedCount,
      uploaded: uploadedCount,
      docs: docsMap,
    };
  });
}

/** ผู้เรียนที่เอกสารยังไม่ครบ สำหรับหน้าเอกสารและกระดานงาน */
export async function listIncompleteDocuments(limit = 100): Promise<IncompletePerson[]> {
  const list = await listDeskSubmissions(limit);
  return list
    .filter((p) => p.passed < DOC_TYPES.length)
    .map((p) => ({
      id: p.id,
      fullName: p.fullName,
      passed: p.passed,
      uploaded: p.uploaded,
    }));
}
