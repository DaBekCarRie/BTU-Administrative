import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * แถวเจ้าหน้าที่ของผู้ใช้ที่ล็อกอินอยู่ — ว่างถ้ายังไม่ล็อกอิน ไม่ใช่เจ้าหน้าที่ หรือถูกปิดใช้งาน
 * (RLS ของตาราง staff กันเจ้าหน้าที่ที่ถูกปิดใช้งานไว้แล้ว — ADR-0005)
 */
async function currentStaff(): Promise<{ id: string; role: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

/**
 * รหัสเจ้าหน้าที่ของผู้ใช้ที่ล็อกอินอยู่
 *
 * ต่างจาก `auth.uid()` เพราะ "เจ้าหน้าที่" กับ "บัญชีเข้าระบบ" แยกกันตั้งแต่ใบ 15
 * เจ้าหน้าที่ที่มีชื่อในข้อมูลเดิมแต่ยังไม่มีบัญชี ก็เป็นเจ้าของเคสได้
 */
export async function currentStaffId(): Promise<string | null> {
  return (await currentStaff())?.id ?? null;
}

/**
 * ผู้ใช้ปัจจุบันเป็นหัวหน้าทีมไหม — ใช้ซ่อนปุ่มของการกระทำที่ย้อนไม่ได้เท่านั้น
 * ด่านจริงอยู่ที่ policy ของฐานข้อมูล ซ่อนปุ่มอย่างเดียวไม่พอ
 */
export async function isTeamLead(): Promise<boolean> {
  return (await currentStaff())?.role === "admin";
}
