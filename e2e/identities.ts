import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * บัญชีทดสอบสามสิทธิ์ (ใบ 01) — ตั้งต้นด้วย `npm run e2e:accounts`
 *
 * เทสต์ทั่วไปใช้ session หัวหน้าทีมเป็นค่าตั้งต้นเหมือนเดิม (playwright.config.ts)
 * เทสต์สิทธิ์เลือกสวม session อื่นด้วย `test.use({ storageState: STORAGE.staff })`
 */
export const STORAGE = {
  lead: "e2e/.auth/user.json",
  staff: "e2e/.auth/staff.json",
  outsider: "e2e/.auth/outsider.json",
} as const;

export type Role = keyof typeof STORAGE;

export const CREDENTIALS: Record<Role, { email?: string; password?: string }> = {
  lead: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  staff: { email: process.env.E2E_STAFF_EMAIL, password: process.env.E2E_STAFF_PASSWORD },
  outsider: { email: process.env.E2E_OUTSIDER_EMAIL, password: process.env.E2E_OUTSIDER_PASSWORD },
};

export function hasCredentials(role: Role): boolean {
  return !!CREDENTIALS[role].email && !!CREDENTIALS[role].password;
}

/**
 * client ของ Supabase ที่ล็อกอินเป็นสิทธิ์นั้น — สำหรับยิง API ตรงโดยไม่ผ่านหน้าเว็บ
 * แบบเดียวกับคนที่ถือ token แล้วข้ามแอปไปเรียกฐานข้อมูลเอง
 */
export async function signedInClient(role: Role): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({
    email: CREDENTIALS[role].email!,
    password: CREDENTIALS[role].password!,
  });
  if (error) throw new Error(`ล็อกอิน${role}ไม่สำเร็จ: ${error.message}`);
  return client;
}
