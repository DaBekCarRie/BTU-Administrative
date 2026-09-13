/**
 * ของใช้ร่วมของสคริปต์ที่ต้องข้าม RLS — service role key อยู่ได้เฉพาะใน scripts/ (CLAUDE.md กฎข้อ 3)
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import type { Database } from "../../src/types/database";

export type AdminClient = SupabaseClient<Database>;

const PAGE = 1000;

/** อ่าน .env.local แล้วสร้าง client ด้วย service role — ไม่มีค่าก็หยุดพร้อมบอกว่าขาดอะไร */
export function createAdminClient(): AdminClient {
  loadEnv({ path: ".env.local", quiet: true });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
    process.exit(1);
  }
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** path ของทุกไฟล์ใน bucket ไล่ลงทุกโฟลเดอร์ — list() ของ Storage คืนทีละชั้น */
export async function listStorageFiles(admin: AdminClient, bucket: string, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`อ่านรายชื่อไฟล์ ${bucket}/${prefix} ไม่สำเร็จ: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // โฟลเดอร์ไม่มี id
      if (entry.id === null) paths.push(...(await listStorageFiles(admin, bucket, path)));
      else paths.push(path);
    }
    if (data.length < PAGE) break;
  }
  return paths;
}
