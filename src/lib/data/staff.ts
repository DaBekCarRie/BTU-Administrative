import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * รหัสเจ้าหน้าที่ของผู้ใช้ที่ล็อกอินอยู่
 *
 * ต่างจาก `auth.uid()` เพราะ "เจ้าหน้าที่" กับ "บัญชีเข้าระบบ" แยกกันตั้งแต่ใบ 15
 * เจ้าหน้าที่ที่มีชื่อในข้อมูลเดิมแต่ยังไม่มีบัญชี ก็เป็นเจ้าของเคสได้
 */
export async function currentStaffId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return data?.id ?? null;
}
