/**
 * ตั้งต้นบัญชีทดสอบสามสิทธิ์สำหรับ e2e (ใบ 01)
 *
 *   npm run e2e:accounts
 *
 * กฎสิทธิ์ของระบบมีสามระดับที่ต้องพิสูจน์ได้ด้วยบัญชีจริง ไม่ใช่แค่ SQL:
 * - หัวหน้าทีม — บัญชีทดสอบเดิม (E2E_EMAIL) ต้องมีแถวเจ้าหน้าที่ role หัวหน้าทีม
 * - เจ้าหน้าที่ — มีแถวเจ้าหน้าที่ role เจ้าหน้าที่
 * - คนนอกทีม — ล็อกอินได้แต่ **ไม่มีแถวเจ้าหน้าที่เลย** (ช่องโหว่ที่ ADR-0005 ปิด)
 *
 * รันซ้ำได้: มีแล้วไม่สร้างซ้ำ แค่ทำให้รหัสผ่าน การยืนยันอีเมล และแถวเจ้าหน้าที่ตรงตามนี้
 * บัญชีที่ยังไม่มีค่าใน .env.local จะถูกสุ่มรหัสผ่านแล้วเขียนต่อท้ายไฟล์ให้ — ไม่พิมพ์รหัสออกจอ
 *
 * ต้องใช้ SUPABASE_SERVICE_ROLE_KEY เพราะต้องสร้างบัญชีที่ยืนยันอีเมลแล้ว
 * (สมัครด้วย anon key ไม่ได้ session เพราะโปรเจกต์เปิดการยืนยันอีเมลไว้)
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";

import { createClient, type User } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import type { Database } from "../src/types/database";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Identity = {
  label: string;
  emailVar: string;
  passwordVar: string;
  defaultEmail: string;
  /** null = ต้องไม่มีแถวเจ้าหน้าที่ */
  staff: { role: "admin" | "staff"; displayName: string } | null;
};

const IDENTITIES: Identity[] = [
  {
    label: "หัวหน้าทีม",
    emailVar: "E2E_EMAIL",
    passwordVar: "E2E_PASSWORD",
    defaultEmail: "e2e-lead@btu-admin.dev",
    // ชื่อเดิม — เทสต์เลขบัตรประชาชนยืนยันชื่อผู้เปิดดูด้วยชื่อนี้
    staff: { role: "admin", displayName: "ผู้ใช้ทดสอบ E2E" },
  },
  {
    label: "เจ้าหน้าที่",
    emailVar: "E2E_STAFF_EMAIL",
    passwordVar: "E2E_STAFF_PASSWORD",
    defaultEmail: "e2e-staff@btu-admin.dev",
    staff: { role: "staff", displayName: "ผู้ใช้ทดสอบ E2E · เจ้าหน้าที่" },
  },
  {
    label: "คนนอกทีม",
    emailVar: "E2E_OUTSIDER_EMAIL",
    passwordVar: "E2E_OUTSIDER_PASSWORD",
    defaultEmail: "e2e-outsider@btu-admin.dev",
    staff: null,
  },
];

async function findUserByEmail(email: string): Promise<User | null> {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`อ่านรายชื่อบัญชีไม่สำเร็จ: ${error.message}`);
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
}

function credentialsFor(identity: Identity): { email: string; password: string } {
  let email = process.env[identity.emailVar];
  let password = process.env[identity.passwordVar];
  const additions: string[] = [];

  if (!email) {
    email = identity.defaultEmail;
    additions.push(`${identity.emailVar}=${email}`);
  }
  if (!password) {
    password = randomBytes(24).toString("base64url");
    additions.push(`${identity.passwordVar}=${password}`);
  }
  if (additions.length > 0) {
    appendFileSync(".env.local", `\n# บัญชีทดสอบ ${identity.label} — สร้างโดย npm run e2e:accounts\n${additions.join("\n")}\n`);
  }
  return { email, password };
}

async function ensureAccount(identity: Identity): Promise<void> {
  const { email, password } = credentialsFor(identity);

  let user = await findUserByEmail(email);
  if (user) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw new Error(`อัปเดตบัญชี${identity.label}ไม่สำเร็จ: ${error.message}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`สร้างบัญชี${identity.label}ไม่สำเร็จ: ${error?.message}`);
    user = data.user;
  }

  const { data: linked, error: readError } = await admin
    .from("staff")
    .select("id, role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (readError) throw new Error(`อ่านแถวเจ้าหน้าที่ไม่สำเร็จ: ${readError.message}`);

  if (!identity.staff) {
    if (linked) {
      // คนนอกต้องไม่มีแถวเจ้าหน้าที่ — ตัดการผูก ไม่ลบ เผื่อแถวนั้นเป็นเจ้าของเคสอยู่
      const { error } = await admin.from("staff").update({ auth_user_id: null }).eq("id", linked.id);
      if (error) throw new Error(`ตัดการผูกแถวเจ้าหน้าที่ของคนนอกไม่สำเร็จ: ${error.message}`);
    }
    console.log(`✓ ${identity.label}: บัญชีพร้อม · ไม่มีแถวเจ้าหน้าที่`);
    return;
  }

  if (linked) {
    const { error } = await admin
      .from("staff")
      .update({ role: identity.staff.role, is_active: true })
      .eq("id", linked.id);
    if (error) throw new Error(`อัปเดตแถวเจ้าหน้าที่ไม่สำเร็จ: ${error.message}`);
  } else {
    const { error } = await admin.from("staff").insert({
      auth_user_id: user.id,
      display_name: identity.staff.displayName,
      role: identity.staff.role,
      is_active: true,
    });
    if (error) throw new Error(`สร้างแถวเจ้าหน้าที่ไม่สำเร็จ: ${error.message}`);
  }
  console.log(`✓ ${identity.label}: บัญชีพร้อม · แถวเจ้าหน้าที่ role ${identity.staff.role}`);
}

for (const identity of IDENTITIES) {
  await ensureAccount(identity);
}
console.log("\nบัญชีทดสอบครบสามสิทธิ์ — รหัสผ่านอยู่ใน .env.local เท่านั้น");
