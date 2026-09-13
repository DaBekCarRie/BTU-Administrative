/**
 * จัดบัญชีเข้าระบบให้เหลือเท่าที่จำเป็น (ใบ 05)
 *
 *   npm run accounts:lead -- --email "<อีเมล Google ของหัวหน้าทีม>"            # ดูว่าจะทำอะไร
 *   npm run accounts:lead -- --email "<อีเมล Google ของหัวหน้าทีม>" --confirm
 *
 * - เตรียมบัญชีของหัวหน้าทีมด้วยอีเมลที่ยืนยันแล้ว แล้วผูกกับแถวเจ้าหน้าที่ role หัวหน้าทีม
 *   ไม่ตั้งรหัสผ่าน — กดลงชื่อเข้าใช้ด้วย Google ครั้งแรก Supabase จะผูก Google เข้ากับบัญชีนี้เอง
 *   เพราะอีเมลตรงกันและยืนยันแล้วทั้งสองฝั่ง
 * - ลบบัญชีโดเมนสมมติ @btu-admin.dev ที่ไม่ใช่บัญชีทดสอบของ e2e
 *   แถวเจ้าหน้าที่ของบัญชีเหล่านั้นไม่ถูกลบ แค่หลุดการผูก (FK on delete set null)
 *   จึงยังเป็นเจ้าของเคสได้เหมือนเดิม
 *
 * รันซ้ำได้ ไม่พิมพ์ชื่อหรืออีเมลของบัญชีที่ลบออกจอ
 */
import type { User } from "@supabase/supabase-js";

import { createAdminClient } from "./lib/admin";

const admin = createAdminClient();

const args = process.argv.slice(2);
const emailIndex = args.indexOf("--email");
const leadEmail = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : undefined;
const confirm = args.includes("--confirm");

if (!leadEmail || !leadEmail.includes("@")) {
  console.error('ต้องระบุอีเมลหัวหน้าทีม: --email "<อีเมล>"');
  process.exit(1);
}

const PLACEHOLDER_DOMAIN = "@btu-admin.dev";
/** ชุดทดสอบสิทธิ์ใช้อยู่ ห้ามลบ (ดู e2e/README.md) */
const KEEP_EMAIL_VARS = ["E2E_EMAIL", "E2E_STAFF_EMAIL", "E2E_OUTSIDER_EMAIL"];
const LEAD_DISPLAY_NAME = "หัวหน้าทีม";

async function listUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`อ่านรายชื่อบัญชีไม่สำเร็จ: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 200) return users;
  }
}

const keep = new Set(
  KEEP_EMAIL_VARS.map((name) => process.env[name]?.toLowerCase()).filter((value): value is string => !!value),
);
if (keep.size !== KEEP_EMAIL_VARS.length) {
  console.error("ไม่พบอีเมลบัญชีทดสอบครบสามบัญชีใน .env.local — รัน npm run e2e:accounts ก่อน");
  process.exit(1);
}

const users = await listUsers();
const leadUser = users.find((user) => user.email?.toLowerCase() === leadEmail);
const toDelete = users.filter((user) => {
  const email = user.email?.toLowerCase() ?? "";
  return email.endsWith(PLACEHOLDER_DOMAIN) && !keep.has(email);
});

console.log(`บัญชีหัวหน้าทีม: ${leadUser ? "มีอยู่แล้ว" : "จะสร้างใหม่"} · ผูกแถวเจ้าหน้าที่ role หัวหน้าทีม`);
console.log(`บัญชีโดเมนสมมติที่จะลบ: ${toDelete.length} · เก็บบัญชีทดสอบ ${keep.size}`);

if (!confirm) {
  console.log("\n[ดูอย่างเดียว] รันซ้ำพร้อม --confirm");
  process.exit(0);
}

let leadId = leadUser?.id;
if (!leadId) {
  const { data, error } = await admin.auth.admin.createUser({ email: leadEmail, email_confirm: true });
  if (error || !data.user) throw new Error(`สร้างบัญชีหัวหน้าทีมไม่สำเร็จ: ${error?.message}`);
  leadId = data.user.id;
}

const { data: linked, error: readError } = await admin
  .from("staff")
  .select("id")
  .eq("auth_user_id", leadId)
  .maybeSingle();
if (readError) throw new Error(`อ่านแถวเจ้าหน้าที่ไม่สำเร็จ: ${readError.message}`);

if (linked) {
  const { error } = await admin.from("staff").update({ role: "admin", is_active: true }).eq("id", linked.id);
  if (error) throw new Error(`อัปเดตแถวเจ้าหน้าที่ไม่สำเร็จ: ${error.message}`);
} else {
  const { error } = await admin.from("staff").insert({
    auth_user_id: leadId,
    display_name: LEAD_DISPLAY_NAME,
    role: "admin",
    is_active: true,
  });
  if (error) throw new Error(`สร้างแถวเจ้าหน้าที่ไม่สำเร็จ: ${error.message}`);
}
console.log("✓ บัญชีหัวหน้าทีมพร้อม");

for (const user of toDelete) {
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(`ลบบัญชีไม่สำเร็จ: ${error.message}`);
}
console.log(`✓ ลบบัญชีโดเมนสมมติ ${toDelete.length} บัญชี`);
