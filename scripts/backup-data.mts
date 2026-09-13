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
import { dirname, join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import type { Database } from "../src/types/database";

loadEnv({ path: ".env.local", quiet: true });

const outIndex = process.argv.indexOf("--out");
const outArg = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
if (!outArg) {
  console.error('ต้องบอกโฟลเดอร์ปลายทาง: npm run db:backup -- --out "<path>"');
  process.exit(1);
}
const outDir = resolve(outArg);
if (outDir.startsWith(process.cwd())) {
  console.error("ห้ามสำรองลงใน repo — ไฟล์มีข้อมูลส่วนบุคคลจริง");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("ต้องตั้ง NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type TableName = keyof Database["public"]["Tables"];
const TABLES: TableName[] = [
  "faculties",
  "programs",
  "staff",
  "answers",
  "people",
  "events",
  "merged_people",
  "applications",
  "payments",
  "documents",
  "document_access_log",
  "exam_center_requests",
  "reference_documents",
  "reference_document_files",
];
const BUCKETS = ["documents", "reference"];
const PAGE = 1000;

mkdirSync(outDir, { recursive: true, mode: 0o700 });
chmodSync(outDir, 0o700);

const manifest: { createdAt: string; tables: Record<string, number>; files: Record<string, number> } = {
  createdAt: new Date().toISOString(),
  tables: {},
  files: {},
};

for (const table of TABLES) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    // ต้องเรียงตาม primary key ไม่งั้นแบ่งหน้าแล้วแถวซ้ำหรือหล่นได้
    const { data, error } = await admin
      .from(table)
      .select("*")
      .order(table === "merged_people" ? "merged_id" : "id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`อ่าน ${table} ไม่สำเร็จ: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows), { mode: 0o600 });
  manifest.tables[table] = rows.length;
  console.log(`✓ ${table}: ${rows.length}`);
}

async function listAll(bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`อ่านรายชื่อไฟล์ ${bucket}/${prefix} ไม่สำเร็จ: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // โฟลเดอร์ไม่มี id
      if (entry.id === null) paths.push(...(await listAll(bucket, path)));
      else paths.push(path);
    }
    if (data.length < PAGE) break;
  }
  return paths;
}

for (const bucket of BUCKETS) {
  const paths = await listAll(bucket, "");
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
