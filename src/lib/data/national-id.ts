import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * เลขบัตรประชาชนตั้งใจไม่ให้ผ่านระบบเหตุการณ์ ทั้งที่ ADR-0001 บอกว่า people มาจาก events
 * เพราะ events.payload เป็น jsonb ที่ไม่ได้เข้ารหัส ถ้าส่งเลขบัตรผ่านทางนั้น
 * เลขตัวจริงจะนอนอยู่ในตาราง events ตลอดไปแบบ plaintext
 *
 * เขียนผ่าน setNationalId อ่านผ่าน readNationalId เท่านั้น ทั้งคู่เขียน log ที่ฝั่งฐานข้อมูล
 */

export async function setNationalId(
  personId: string,
  nationalId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_national_id", {
    p_person_id: personId,
    p_national_id: nationalId,
  });
  if (error) throw new Error(error.message);
}

export async function readNationalId(personId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("read_national_id", {
    p_person_id: personId,
  });
  if (error) throw new Error(error.message);
  return data ?? null;
}

export type AccessLogEntry = {
  id: number;
  what: string;
  viewedAt: string;
  viewedByName: string | null;
  personName: string | null;
};

/** ร่องรอยการเปิดดูข้อมูลอ่อนไหว — หัวหน้าทีมเท่านั้นที่อ่านได้ (RLS บังคับ) */
export async function listAccessLog(limit = 200): Promise<AccessLogEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_access_log")
    .select("id, what, viewed_at, staff:viewed_by ( display_name ), people ( full_name )")
    .order("viewed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`อ่านร่องรอยการเข้าถึงไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    what: row.what,
    viewedAt: row.viewed_at,
    viewedByName: row.staff?.display_name ?? null,
    personName: row.people?.full_name ?? null,
  }));
}
