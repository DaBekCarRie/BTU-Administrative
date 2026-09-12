import "server-only";

import { endOfTodayBangkok, startOfTodayBangkok } from "@/lib/date";
import { CLOSED_STATUSES } from "@/lib/domain/events";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type QueueItem = {
  id: string;
  fullName: string;
  phone: string | null;
  facebookName: string | null;
  programName: string | null;
  studyMode: string | null;
  ownerName: string | null;
  nextCallAt: string;
  callCount: number;
  lastCallOutcome: string | null;
  lastCallNote: string | null;
};

const COLUMNS = `id, full_name, phone, facebook_name, study_mode, next_call_at,
   call_count, last_call_outcome, last_call_note,
   programs ( name ), staff ( display_name )`;

/**
 * แถวจาก view มา nullable ทุกช่อง เพราะ Postgres ไม่รับประกัน nullability ของ view
 * แต่ query กรอง next_call_at ไม่เป็น null มาแล้ว และ id/full_name เป็น not null ในตารางต้นทาง
 *
 * ต่อยอดจาก type ที่ generate มา ไม่ประกาศคอลัมน์ซ้ำเอง (CLAUDE.md กฎข้อ 2)
 * มีแค่ส่วน join ที่ต้องบอกรูปเอง เพราะ generator ไม่รู้ว่า select ดึงอะไรมาแนบ
 */
type QueueRow = Pick<
  Tables<"people_with_call_summary">,
  | "id"
  | "full_name"
  | "phone"
  | "facebook_name"
  | "study_mode"
  | "next_call_at"
  | "call_count"
  | "last_call_outcome"
  | "last_call_note"
> & {
  programs: { name: string } | null;
  staff: { display_name: string } | null;
};

function toItem(row: QueueRow): QueueItem {
  return {
    id: row.id ?? "",
    fullName: row.full_name ?? "",
    phone: row.phone,
    facebookName: row.facebook_name,
    programName: row.programs?.name ?? null,
    studyMode: row.study_mode,
    ownerName: row.staff?.display_name ?? null,
    nextCallAt: row.next_call_at ?? "",
    callCount: row.call_count ?? 0,
    lastCallOutcome: row.last_call_outcome,
    lastCallNote: row.last_call_note,
  };
}

export type CallQueue = {
  overdue: QueueItem[];
  today: QueueItem[];
  /** จำนวนทั้งหมดที่ถึงกำหนด — อาจมากกว่าที่แสดง */
  total: number;
  truncated: boolean;
};

/**
 * แสดงได้มากสุดเท่านี้ต่อครั้ง
 * PostgREST คืนสูงสุด 1,000 แถวอยู่แล้ว ถ้าไม่กำหนดเองจะถูกตัดเงียบ ๆ
 * โดยที่หน้าจอไม่บอกว่ายังมีอีก
 */
const QUEUE_LIMIT = 200;

/**
 * คิวโทร — แยกคนที่เลยกำหนดออกจากคนที่ถึงกำหนดวันนี้พอดี
 * คนที่ปิดเคสหรือสมัครแล้วไม่ปรากฏ
 */
export async function getCallQueue(): Promise<CallQueue> {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("people_with_call_summary")
    .select(COLUMNS, { count: "exact" })
    .not("next_call_at", "is", null)
    .lte("next_call_at", endOfTodayBangkok())
    .not("follow_up_status", "in", `(${CLOSED_STATUSES.join(",")})`)
    .order("next_call_at", { ascending: true })
    .limit(QUEUE_LIMIT);

  if (error) throw new Error(`อ่านคิวโทรไม่สำเร็จ: ${error.message}`);

  const startToday = startOfTodayBangkok();
  const items = (data ?? []).map(toItem);
  const total = count ?? items.length;

  return {
    overdue: items.filter((item) => item.nextCallAt < startToday),
    today: items.filter((item) => item.nextCallAt >= startToday),
    total,
    truncated: total > items.length,
  };
}
