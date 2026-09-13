/**
 * ถอดข้อมูลส่วนบุคคลจริงออกจากฐานข้อมูล เพื่อนำเข้าไฟล์สมมติแทน (ใบ 04)
 *
 *   npm run db:reset-to-mock                 # นับอย่างเดียว ไม่ลบอะไร
 *   npm run db:reset-to-mock -- --confirm    # ลบจริง
 *   npm run import:leads -- --file data/leads-mock.csv
 *
 * สิ่งที่ทำ
 * - ลบไฟล์ทุกไฟล์ในที่เก็บเอกสารรายคน — มีสำเนาบัตรประชาชนจริงอยู่ในนั้น
 * - ลบคนทุกคน ของที่อ้างถึงคนหายตามด้วย cascade: เหตุการณ์ การสมัคร การชำระเงิน เอกสาร
 *   คำขอศูนย์สอบ ร่องรอยการเปิดดู รายการที่ถูกรวม
 * - เปลี่ยนชื่อแถวเจ้าหน้าที่จริงเป็นชื่อสมมติ ตามตาราง owners ใน scripts/mock-staff.local.json
 *   ชุดเดียวกับที่ใช้สร้าง data/leads-mock.csv ตารางแปลงชื่อผู้ดูแลตอนนำเข้าจึงจับคู่ได้
 *   ไม่ลบแถวเจ้าหน้าที่ เพราะต้องเป็นเจ้าของเคสของไฟล์สมมติต่อ
 *
 * ลบทั้งชุดแล้วนำเข้าใหม่ ไม่เขียนทับ payload ของเหตุการณ์เดิม (ADR-0001)
 * สำรองก่อนเสมอด้วย npm run db:backup — สคริปต์นี้ไม่มีทางย้อนกลับในตัว
 */
import { existsSync, readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import type { Database } from "../src/types/database";

loadEnv({ path: ".env.local", quiet: true });

const confirm = process.argv.includes("--confirm");
const STAFF_MAP_PATH = "scripts/mock-staff.local.json";
const PERSON_BUCKET = "documents";
const PAGE = 1000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}
if (!existsSync(STAFF_MAP_PATH)) {
  console.error(`ไม่มี ${STAFF_MAP_PATH} — ต้องใช้ตารางชื่อชุดเดียวกับที่สร้างไฟล์สมมติ`);
  process.exit(1);
}
const staffMap = (JSON.parse(readFileSync(STAFF_MAP_PATH, "utf8")) as { owners: Record<string, string> })
  .owners;

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type CountedTable =
  | "people"
  | "events"
  | "applications"
  | "payments"
  | "documents"
  | "document_access_log"
  | "exam_center_requests"
  | "merged_people";
const CASCADED: CountedTable[] = [
  "people",
  "events",
  "applications",
  "payments",
  "documents",
  "document_access_log",
  "exam_center_requests",
  "merged_people",
];

async function count(table: CountedTable): Promise<number> {
  const { count: total, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`นับ ${table} ไม่สำเร็จ: ${error.message}`);
  return total ?? 0;
}

async function listAll(prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(PERSON_BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`อ่านรายชื่อไฟล์ไม่สำเร็จ: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) paths.push(...(await listAll(path)));
      else paths.push(path);
    }
    if (data.length < PAGE) break;
  }
  return paths;
}

const { data: staff, error: staffError } = await admin.from("staff").select("id, display_name");
if (staffError) throw new Error(`อ่านเจ้าหน้าที่ไม่สำเร็จ: ${staffError.message}`);
const renames = staff.filter((row) => row.display_name in staffMap);
const files = await listAll("");

console.log("=== จะถูกลบ ===");
for (const table of CASCADED) {
  console.log(`${table.padEnd(22)} ${await count(table)}`);
}
console.log(`${`storage/${PERSON_BUCKET}`.padEnd(22)} ${files.length} ไฟล์`);
// ไม่พิมพ์ชื่อจริงออกจอ
console.log(`\nแถวเจ้าหน้าที่ที่จะเปลี่ยนเป็นชื่อสมมติ ${renames.length} จาก ${staff.length}`);

if (!confirm) {
  console.log("\n[นับอย่างเดียว] สำรองด้วย npm run db:backup แล้วรันซ้ำพร้อม --confirm");
  process.exit(0);
}

for (let i = 0; i < files.length; i += 100) {
  const { error } = await admin.storage.from(PERSON_BUCKET).remove(files.slice(i, i + 100));
  if (error) throw new Error(`ลบไฟล์ไม่สำเร็จ: ${error.message}`);
}

// PostgREST ไม่ยอมลบโดยไม่มีเงื่อนไข — ทุกแถวมี id จึงใช้ not is null
const { error: deleteError } = await admin.from("people").delete().not("id", "is", null);
if (deleteError) throw new Error(`ลบคนไม่สำเร็จ: ${deleteError.message}`);

for (const row of renames) {
  const { error } = await admin
    .from("staff")
    .update({ display_name: staffMap[row.display_name] })
    .eq("id", row.id);
  if (error) throw new Error(`เปลี่ยนชื่อเจ้าหน้าที่ไม่สำเร็จ: ${error.message}`);
}

console.log("\n=== หลังลบ ===");
for (const table of CASCADED) {
  console.log(`${table.padEnd(22)} ${await count(table)}`);
}
console.log(`${`storage/${PERSON_BUCKET}`.padEnd(22)} ${(await listAll("")).length} ไฟล์`);
console.log("\nต่อด้วย: npm run import:leads -- --file data/leads-mock.csv");
