import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * ข้าม RLS ทั้งหมด — ใช้เฉพาะสคริปต์ import และงานเบื้องหลังที่เชื่อถือได้
 *
 * ห้าม import ไฟล์นี้จาก Client Component เด็ดขาด
 * และห้ามใช้แทน createClient() ใน Server Component เพื่อ "ให้มันผ่าน"
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    env.supabaseUrl,
    serverEnv().serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
