/**
 * ถอดข้อมูลคนออกจากฐานข้อมูลทั้งหมด เพื่อนำเข้าชุดใหม่แทน (ใบ 04)
 *
 *   npm run db:reset-to-mock                 # นับอย่างเดียว ไม่ลบอะไร
 *   npm run db:reset-to-mock -- --confirm    # ลบจริง
 *   npm run import:leads -- --file data/leads-mock.csv
 *
 * สิ่งที่ทำ
 * - ลบไฟล์ทุกไฟล์ในที่เก็บเอกสารรายคน — มีสำเนาบัตรประชาชนอยู่ในนั้น
 * - ลบคนทุกคน ของที่อ้างถึงคนหายตามด้วย cascade: เหตุการณ์ การสมัคร การชำระเงิน เอกสาร
 *   คำขอศูนย์สอบ ร่องรอยการเปิดดู รายการที่ถูกรวม
 * - เปลี่ยนชื่อแถวเจ้าหน้าที่จริงเป็นชื่อสมมติ ตามตาราง owners ใน scripts/mock-staff.local.json
 *   ชุดเดียวกับที่ใช้สร้าง data/leads-mock.csv ตารางแปลงชื่อผู้ดูแลตอนนำเข้าจึงจับคู่ได้
 *   ไม่ลบแถวเจ้าหน้าที่ เพราะต้องเป็นเจ้าของเคสของชุดใหม่ต่อ
 *   ตอนนำข้อมูลจริงกลับ ใช้ --skip-staff-rename (ไม่ต้องมีไฟล์ตารางชื่อ)
 *
 * ลบทั้งชุดแล้วนำเข้าใหม่ ไม่เขียนทับ payload ของเหตุการณ์เดิม — ข้อยกเว้นที่ ADR-0001 อนุญาต
 * สำรองก่อนเสมอด้วย npm run db:backup — สคริปต์นี้ไม่มีทางย้อนกลับในตัว
 */
import { existsSync, readFileSync } from "node:fs";

import { createAdminClient, listStorageFiles } from "./lib/admin";

const confirm = process.argv.includes("--confirm");
const skipStaffRename = process.argv.includes("--skip-staff-rename");
const STAFF_MAP_PATH = "scripts/mock-staff.local.json";
const PERSON_BUCKET = "documents";

let staffMap: Record<string, string> = {};
if (!skipStaffRename) {
  if (!existsSync(STAFF_MAP_PATH)) {
    console.error(
      `ไม่มี ${STAFF_MAP_PATH} — ต้องใช้ตารางชื่อชุดเดียวกับที่สร้างไฟล์สมมติ\n` +
        "ถ้ากำลังนำข้อมูลจริงกลับ ใช้ --skip-staff-rename",
    );
    process.exit(1);
  }
  staffMap = (JSON.parse(readFileSync(STAFF_MAP_PATH, "utf8")) as { owners: Record<string, string> }).owners;
}

const admin = createAdminClient();

/** people ต้องมาก่อน — ลบแถวนี้แล้วที่เหลือหายตามด้วย cascade */
const CASCADED = [
  "people",
  "events",
  "applications",
  "payments",
  "documents",
  "document_access_log",
  "exam_center_requests",
  "merged_people",
] as const;

async function count(table: (typeof CASCADED)[number]): Promise<number> {
  const { count: total, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`นับ ${table} ไม่สำเร็จ: ${error.message}`);
  return total ?? 0;
}

async function report(): Promise<void> {
  for (const table of CASCADED) {
    console.log(`${table.padEnd(22)} ${await count(table)}`);
  }
  const files = await listStorageFiles(admin, PERSON_BUCKET);
  console.log(`${`storage/${PERSON_BUCKET}`.padEnd(22)} ${files.length} ไฟล์`);
}

const { data: staff, error: staffError } = await admin.from("staff").select("id, display_name");
if (staffError) throw new Error(`อ่านเจ้าหน้าที่ไม่สำเร็จ: ${staffError.message}`);
const renames = staff.filter((row) => row.display_name in staffMap);

console.log("=== จะถูกลบ ===");
await report();
// ไม่พิมพ์ชื่อจริงออกจอ
console.log(`\nแถวเจ้าหน้าที่ที่จะเปลี่ยนเป็นชื่อสมมติ ${renames.length} จาก ${staff.length}`);

if (!confirm) {
  console.log("\n[นับอย่างเดียว] สำรองด้วย npm run db:backup แล้วรันซ้ำพร้อม --confirm");
  process.exit(0);
}

const files = await listStorageFiles(admin, PERSON_BUCKET);
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
await report();
console.log("\nต่อด้วย: npm run import:leads -- --file <ไฟล์>.csv");
