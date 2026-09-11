import "server-only";

import { createClient } from "@/lib/supabase/server";

/** สถานะที่จบแล้ว ไม่ต้องโผล่ในคิวโทรอีก */
const CLOSED = ["ไม่สนใจ", "ติดต่อไม่ได้", "สมัครแล้ว"] as const;

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
 */
type QueueRow = {
  id: string | null;
  full_name: string | null;
  phone: string | null;
  facebook_name: string | null;
  study_mode: string | null;
  next_call_at: string | null;
  call_count: number | null;
  last_call_outcome: string | null;
  last_call_note: string | null;
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

/** สิ้นสุดวันนี้ตามเวลาไทย ในรูป ISO */
function endOfTodayBangkok(): string {
  const now = new Date();
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  bangkok.setUTCHours(23, 59, 59, 999);
  return new Date(bangkok.getTime() - 7 * 60 * 60 * 1000).toISOString();
}

function startOfTodayBangkok(): string {
  const now = new Date();
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  bangkok.setUTCHours(0, 0, 0, 0);
  return new Date(bangkok.getTime() - 7 * 60 * 60 * 1000).toISOString();
}

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
    .not("follow_up_status", "in", `(${CLOSED.join(",")})`)
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

/** ผู้สนใจที่ไม่มีใครแตะมานานเกินกำหนด และยังไม่ปิดเคส */
export async function countStale(days: number): Promise<number> {
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  const { count, error } = await supabase
    .from("people")
    .select("id", { count: "exact", head: true })
    .lt("last_event_at", cutoff)
    .not("follow_up_status", "in", `(${CLOSED.join(",")})`);

  if (error) throw new Error(`นับงานค้างไม่สำเร็จ: ${error.message}`);
  return count ?? 0;
}
