import "server-only";

import { DOC_TYPES } from "@/lib/documents-shared";
import { CLOSED_STATUSES } from "@/lib/domain/events";
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

export type WorkBoard = {
  staleLeads: number;
  awaitingStudentCode: number;
  incompleteDocuments: number;
  appliedThisMonth: number;
  enrolled: number;
  dropped: number;
};

/**
 * ตัวเลขทั้งหมดนับในฐานข้อมูล ไม่ดึงแถวมานับเอง
 * ของเดิมดึงใบสมัครมานับใน JS แล้ว .limit(1000) ตัดเงียบ ๆ และนับใบแทนที่จะนับคน
 */
export async function getWorkBoard(): Promise<WorkBoard> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("work_board_counts", {
      p_stale_days: THRESHOLDS.staleLeadDays,
      p_awaiting_days: THRESHOLDS.awaitingStudentCodeDays,
      p_doc_types: DOC_TYPES.length,
      p_closed_statuses: [...CLOSED_STATUSES],
    })
    .single();

  if (error) throw new Error(`อ่านกระดานงานค้างไม่สำเร็จ: ${error.message}`);

  return {
    staleLeads: Number(data.stale_leads),
    awaitingStudentCode: Number(data.awaiting_student_code),
    incompleteDocuments: Number(data.incomplete_documents),
    appliedThisMonth: Number(data.applied_this_month),
    enrolled: Number(data.enrolled),
    dropped: Number(data.dropped),
  };
}
