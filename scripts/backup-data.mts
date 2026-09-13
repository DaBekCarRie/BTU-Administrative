/**
 * สำรองข้อมูลทุกตารางใน public และไฟล์ทุกไฟล์ใน Storage ลงเครื่อง (ใบ 04)
 *
 *   npm run db:backup -- --out "<โฟลเดอร์นอก repo>"
 *
 * ใช้ก่อนล้างข้อมูลจริง เพราะโปรเจกต์นี้ไม่มีรหัสผ่านฐานข้อมูลในเครื่องให้ pg_dump
 * ได้ JSON หนึ่งไฟล์ต่อตาราง + ไฟล์ Storage ตาม path เดิม + manifest.json นับจำนวนไว้เทียบ
 *
 * ผลลัพธ์มีข้อมูลส่วนบุคคลจริงและสำเนาบัตรประชาชน — ห้ามวางไว้ใน repo หรือโฟลเดอร์ที่ซิงก์ขึ้นคลาวด์
 * เลขบัตรประชาชนออกมาเป็นค่าที่เข้ารหัสอยู่ ถอดได้ด้วยคีย์ใน Vault ของโปรเจกต์เดิมเท่านั้น
 */
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import type { Database } from "../src/types/database";
import { createAdminClient, listStorageFiles } from "./lib/admin";

const outIndex = process.argv.indexOf("--out");
const outArg = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
if (!outArg) {
  console.error('ต้องบอกโฟลเดอร์ปลายทาง: npm run db:backup -- --out "<path>"');
  process.exit(1);
}
const outDir = resolve(outArg);
const fromRepo = relative(process.cwd(), outDir);
if (!fromRepo.startsWith("..") && !isAbsolute(fromRepo)) {
  console.error("ห้ามสำรองลงใน repo — ไฟล์มีข้อมูลส่วนบุคคลจริง");
  process.exit(1);
}

const admin = createAdminClient();

type TableName = keyof Database["public"]["Tables"];
/** ต้องเรียงตาม primary key ตอนแบ่งหน้า ไม่งั้นแถวซ้ำหรือหล่นได้ */
const PRIMARY_KEY: Record<TableName, string> = {
  faculties: "id",
  programs: "id",
  staff: "id",
  answers: "id",
  people: "id",
  events: "id",
  merged_people: "merged_id",
  applications: "id",
  payments: "id",
  documents: "id",
  document_access_log: "id",
  exam_center_requests: "id",
  reference_documents: "id",
  reference_document_files: "id",
};
const BUCKETS = ["documents", "reference"];
const PAGE = 1000;

mkdirSync(outDir, { recursive: true, mode: 0o700 });
chmodSync(outDir, 0o700);

const manifest: { createdAt: string; tables: Record<string, number>; files: Record<string, number> } = {
  createdAt: new Date().toISOString(),
  tables: {},
  files: {},
};

for (const table of Object.keys(PRIMARY_KEY) as TableName[]) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(table)
      .select("*")
      .order(PRIMARY_KEY[table])
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`อ่าน ${table} ไม่สำเร็จ: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows), { mode: 0o600 });
  manifest.tables[table] = rows.length;
  console.log(`✓ ${table}: ${rows.length}`);
}

for (const bucket of BUCKETS) {
  const paths = await listStorageFiles(admin, bucket);
  for (const path of paths) {
    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error) throw new Error(`ดาวน์โหลด ${bucket}/${path} ไม่สำเร็จ: ${error.message}`);
    const target = join(outDir, "storage", bucket, path);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, Buffer.from(await data.arrayBuffer()), { mode: 0o600 });
  }
  manifest.files[bucket] = paths.length;
  console.log(`✓ storage/${bucket}: ${paths.length} ไฟล์`);
}

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
console.log(`\nสำรองครบ → ${outDir}`);
