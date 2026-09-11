import "server-only";

import { DOC_TYPES } from "@/lib/documents-shared";
import { createClient } from "@/lib/supabase/server";

/**
 * เกณฑ์ว่าอะไรถือว่า "ค้าง" อยู่ที่เดียว
 * ทีมขอปรับได้โดยไม่ต้องไล่แก้หลายที่ในโค้ด
 */
export const THRESHOLDS = {
  /** ผู้สนใจที่ไม่มีใครแตะเกินกี่วันถือว่าค้าง */
  staleLeadDays: 7,
  /** ชำระเงินแล้วแต่ยังไม่ได้รหัสนักศึกษาเกินกี่วันถือว่าค้าง */
  awaitingStudentCodeDays: 3,
} as const;

const CLOSED = ["ไม่สนใจ", "ติดต่อไม่ได้", "สมัครแล้ว"] as const;

export type WorkBoard = {
  staleLeads: number;
  awaitingStudentCode: number;
  incompleteDocuments: number;
  appliedThisMonth: number;
  enrolled: number;
  dropped: number;
};

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** ต้นเดือนนี้ตามเวลาไทย */
function startOfMonthBangkok(): string {
  const bangkok = new Date(Date.now() + 7 * 3_600_000);
  const start = Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), 1);
  return new Date(start - 7 * 3_600_000).toISOString();
}

export async function getWorkBoard(): Promise<WorkBoard> {
  const supabase = await createClient();

  const notClosed = `(${CLOSED.join(",")})`;

  const [stale, awaiting, applied, enrolled, dropped, docPeople] =
    await Promise.all([
      supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .lt("last_event_at", daysAgo(THRESHOLDS.staleLeadDays))
        .not("follow_up_status", "in", notClosed),

      // ชำระแล้วแต่ยังไม่ได้รหัสนักศึกษา — จุดที่คนตกหล่นระหว่างรอสำนักทะเบียน
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .is("student_code", null)
        .lt("updated_at", daysAgo(THRESHOLDS.awaitingStudentCodeDays))
        .in("status", ["รอเอกสาร", "รอชำระเงิน", "รอตรวจสอบ"]),

      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonthBangkok()),

      supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_status", "เรียนอยู่"),

      supabase
        .from("people")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_status", "ดรอป"),

      // นับคนที่มีการสมัครแล้วแต่เอกสารยังตรวจไม่ผ่านครบ
      supabase
        .from("applications")
        .select("person_id, people!inner ( documents ( status ) )")
        .limit(1000),
    ]);

  const incompleteDocuments = (docPeople.data ?? []).filter((row) => {
    const passed = (row.people?.documents ?? []).filter(
      (doc) => doc.status === "ผ่าน",
    ).length;
    return passed < DOC_TYPES.length;
  }).length;

  return {
    staleLeads: stale.count ?? 0,
    awaitingStudentCode: awaiting.count ?? 0,
    incompleteDocuments,
    appliedThisMonth: applied.count ?? 0,
    enrolled: enrolled.count ?? 0,
    dropped: dropped.count ?? 0,
  };
}
