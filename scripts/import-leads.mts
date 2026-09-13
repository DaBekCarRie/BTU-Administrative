/**
 * นำเข้าข้อมูลผู้สนใจจากชีทเดิม
 *
 *   npm run import:leads -- --file "<path>.csv" --dry-run
 *   npm run import:leads -- --file "<path>.csv"
 *
 * เขียนผ่าน record_event() เหมือนที่แอปใช้ — ห้าม INSERT ลงตาราง events ตรง ๆ
 * ไม่งั้นสถานะปัจจุบันจะเพี้ยนโดยไม่มีอะไรเตือน (ADR-0001)
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import { applyEvent, type DomainEvent, type PersonState } from "../src/lib/domain/events";
import { normalizePhone } from "../src/lib/phone";
import {
  cleanText,
  normalizeFaculty,
  normalizePriorEducation,
  normalizeProgram,
  normalizeStudyMode,
  parseCallDateField,
  parseContactDate,
  parseFollowUp,
} from "../src/lib/import/normalize";
import { parseCsv } from "../src/lib/import/csv";

loadEnv({ path: ".env.local", quiet: true });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileIndex = args.indexOf("--file");
const filePath = fileIndex >= 0 ? args[fileIndex + 1] : undefined;
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;

if (!filePath) {
  console.error("ต้องระบุไฟล์: --file <path>.csv");
  process.exit(1);
}

const COL = {
  contactedAt: 1,
  name: 2,
  line: 3,
  facebook: 4,
  normal: 5,
  supplementary: 6,
  distance: 7,
  faculty: 9,
  program: 10,
  priorEducation: 11,
  phone: 14,
  callDate: 15,
  note: 17,
  owner: 18,
  followUps: [19, 20, 21, 22, 23, 24],
} as const;

type Problem = { row: number; name: string; what: string };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let supabase: SupabaseClient;
  if (serviceKey) {
    supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_EMAIL!,
      password: process.env.E2E_PASSWORD!,
    });
    if (error) throw new Error(`ล็อกอินไม่สำเร็จ: ${error.message}`);
    console.warn("⚠️  ยังไม่ได้ตั้ง SUPABASE_SERVICE_ROLE_KEY — ใช้บัญชีพัฒนาแทน\n");
  }

  const [{ data: faculties }, { data: programs }, { data: staff }] =
    await Promise.all([
      supabase.from("faculties").select("id, name"),
      supabase.from("programs").select("id, name, faculty_id"),
      supabase.from("staff").select("id, display_name"),
    ]);

  const facultyByName = new Map((faculties ?? []).map((f) => [f.name, f.id]));
  const programByName = new Map((programs ?? []).map((p) => [p.name, p.id]));
  const staffByName = new Map((staff ?? []).map((s) => [s.display_name, s.id]));

  const rows = parseCsv(readFileSync(filePath!, "utf8"));
  const dataRows = rows.slice(2).filter((r) => r.some((c) => c.trim() !== ""));

  const problems: Problem[] = [];
  const unknownFaculties = new Map<string, number>();
  const unknownPrograms = new Map<string, number>();
  const unknownOwners = new Map<string, number>();
  const nameCounts = new Map<string, number[]>();
  const phoneCounts = new Map<string, number[]>();

  type Prepared = {
    rowNumber: number;
    personId: string;
    events: DomainEvent[];
    name: string;
  };
  const prepared: Prepared[] = [];

  let followUpCount = 0;
  let statusFromDateField = 0;
  let futureAppointments = 0;
  let futureContactDates = 0;

  for (const [index, row] of dataRows.entries()) {
    if (prepared.length >= limit) break;
    const rowNumber = index + 3;
    const name = cleanText(row[COL.name]);

    if (!name) {
      problems.push({ row: rowNumber, name: "", what: "ไม่มีชื่อ" });
      continue;
    }

    const contactDate = parseContactDate(row[COL.contactedAt]);
    if (contactDate.rejectedAsFuture) {
      futureContactDates += 1;
      problems.push({
        row: rowNumber,
        name,
        what: `วันติดต่อเข้ามาอยู่ในอนาคต (${cleanText(row[COL.contactedAt])}) — ทิ้งค่าวันที่`,
      });
    }
    const contactedAt = contactDate.value ?? new Date().toISOString();

    const facultyName = normalizeFaculty(row[COL.faculty]);
    const rawFaculty = cleanText(row[COL.faculty]);
    if (rawFaculty && !facultyName) {
      unknownFaculties.set(rawFaculty, (unknownFaculties.get(rawFaculty) ?? 0) + 1);
    }

    const programName = normalizeProgram(row[COL.program]);
    const rawProgram = cleanText(row[COL.program]);
    if (rawProgram && !programName) {
      unknownPrograms.set(rawProgram, (unknownPrograms.get(rawProgram) ?? 0) + 1);
    }

    const ownerName = cleanText(row[COL.owner]);
    const ownerId = ownerName ? (staffByName.get(ownerName) ?? null) : null;
    if (ownerName && !ownerId) {
      unknownOwners.set(ownerName, (unknownOwners.get(ownerName) ?? 0) + 1);
    }

    const rawPhone = cleanText(row[COL.phone]);
    const phone = normalizePhone(rawPhone);
    if (rawPhone && !phone && !/^x+$/i.test(rawPhone)) {
      problems.push({ row: rowNumber, name, what: `เบอร์โทรใช้ไม่ได้: ${rawPhone}` });
    }

    const personId = randomUUID();
    const events: DomainEvent[] = [
      {
        type: "ติดต่อเข้ามา",
        occurredAt: contactedAt,
        sequence: 0,
        payload: {
          fullName: name,
          nickname: null,
          phone,
          lineId: cleanText(row[COL.line]) ? "มี Line" : null,
          facebookName: cleanText(row[COL.facebook]) ? name : null,
          studyMode: normalizeStudyMode(
            row[COL.normal],
            row[COL.supplementary],
            row[COL.distance],
          ),
          facultyId: facultyName ? (facultyByName.get(facultyName) ?? null) : null,
          programId: programName ? (programByName.get(programName) ?? null) : null,
          priorEducation: normalizePriorEducation(row[COL.priorEducation]),
          ownerId,
          note: cleanText(row[COL.note]) || null,
          source: cleanText(row[COL.facebook]) ? "Facebook" : null,
        },
      },
    ];

    // แตกคอลัมน์ติดตาม 6 ช่องเป็นเหตุการณ์แยกแถว
    let sequence = 1;
    for (const column of COL.followUps) {
      const followUp = parseFollowUp(row[column]);
      if (!followUp) continue;
      followUpCount += 1;
      events.push({
        type: "โทรตาม",
        occurredAt: followUp.occurredAt ?? contactedAt,
        sequence: sequence++,
        payload: { outcome: followUp.outcome, note: followUp.note },
      });
    }

    // ช่อง "วันที่ให้โทร" มีทั้งวันที่และสถานะปนกัน
    const callField = parseCallDateField(row[COL.callDate]);
    if (callField.kind === "status") {
      statusFromDateField += 1;
      if (callField.value === "สมัครแล้ว") {
        events.push({
          type: "โทรตาม",
          occurredAt: contactedAt,
          sequence: sequence++,
          payload: { outcome: "สมัครแล้ว", note: "จากช่องวันที่ให้โทรในชีทเดิม" },
        });
      } else {
        events.push({
          type: "ปิดเคส",
          occurredAt: contactedAt,
          sequence: sequence++,
          payload: {
            reason: callField.value === "ไม่สนใจ" ? "ไม่สนใจ" : "ติดต่อไม่ได้",
            note: "จากช่องวันที่ให้โทรในชีทเดิม",
          },
        });
      }
    } else if (callField.kind === "date") {
      // วันที่ในอดีตคือประวัติ ไม่ใช่นัดหมายที่ยังค้าง
      // ถ้าตั้งเป็น next_call_at ทั้งหมด คิวโทรวันแรกจะมีคนค้างเป็นพันจนใช้ไม่ได้
      const isFuture = new Date(callField.value).getTime() > Date.now();
      if (isFuture) futureAppointments += 1;
      events.push({
        type: "โทรตาม",
        occurredAt: callField.value,
        sequence: sequence++,
        payload: {
          outcome: isFuture ? "นัดโทรใหม่" : "ขอคิดดูก่อน",
          nextCallAt: isFuture ? callField.value : null,
          note: isFuture ? null : "วันที่นัดโทรจากชีทเดิม (ผ่านไปแล้ว)",
        },
      });
    } else if (callField.kind === "unknown") {
      problems.push({
        row: rowNumber,
        name,
        what: `ช่องวันที่ให้โทรอ่านไม่ออก: ${callField.raw}`,
      });
    }

    nameCounts.set(name, [...(nameCounts.get(name) ?? []), rowNumber]);
    if (phone) {
      phoneCounts.set(phone, [...(phoneCounts.get(phone) ?? []), rowNumber]);
    }

    prepared.push({ rowNumber, personId, events, name });
  }

  const duplicateNames = [...nameCounts.entries()].filter(([, r]) => r.length > 1);
  const duplicatePhones = [...phoneCounts.entries()].filter(([, r]) => r.length > 1);

  console.log("=== สรุปการแปลงข้อมูล ===");
  console.log(`แถวในไฟล์            ${dataRows.length}`);
  console.log(`เตรียมนำเข้าได้        ${prepared.length}`);
  console.log(`เหตุการณ์โทรตาม       ${followUpCount}`);
  console.log(`สถานะที่ดึงจากช่องวันที่ ${statusFromDateField}`);
  console.log(`นัดโทรที่ยังไม่ถึงกำหนด  ${futureAppointments}`);
  console.log(`วันติดต่อเข้ามาในอนาคต  ${futureContactDates} (ทิ้งค่าวันที่ ใช้เวลานำเข้าแทน)`);
  console.log(`ชื่อซ้ำ                ${duplicateNames.length} กลุ่ม (${duplicateNames.reduce((n, [, r]) => n + r.length - 1, 0)} แถวเกิน)`);
  console.log(`เบอร์ซ้ำ               ${duplicatePhones.length} กลุ่ม`);

  if (unknownFaculties.size > 0) {
    console.log(`\n--- คณะที่ยังแปลงไม่ได้ (${unknownFaculties.size} ค่า) ---`);
    for (const [value, count] of [...unknownFaculties].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`  ${count.toString().padStart(4)} × ${value}`);
    }
  }
  if (unknownPrograms.size > 0) {
    console.log(`\n--- สาขาที่ยังแปลงไม่ได้ (${unknownPrograms.size} ค่า) ---`);
    for (const [value, count] of [...unknownPrograms].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
      console.log(`  ${count.toString().padStart(4)} × ${value}`);
    }
  }
  if (unknownOwners.size > 0) {
    console.log(`\n--- ชื่อผู้ดูแลที่ไม่มีในระบบ ---`);
    for (const [value, count] of [...unknownOwners].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count.toString().padStart(4)} × ${value}`);
    }
  }
  if (problems.length > 0) {
    console.log(`\n--- แถวที่มีปัญหา (${problems.length}) ---`);
    for (const problem of problems.slice(0, 20)) {
      console.log(`  แถว ${problem.row} ${problem.name}: ${problem.what}`);
    }
    if (problems.length > 20) console.log(`  ...และอีก ${problems.length - 20} แถว`);
  }

  console.log(`\n--- ซ้ำ: ให้คนตัดสิน ระบบไม่รวมให้เอง ---`);
  for (const [value, rowNumbers] of duplicateNames.slice(0, 10)) {
    console.log(`  ชื่อ "${value}" แถว ${rowNumbers.join(", ")}`);
  }
  for (const [value, rowNumbers] of duplicatePhones.slice(0, 10)) {
    console.log(`  เบอร์ ${value} แถว ${rowNumbers.join(", ")}`);
  }

  if (dryRun) {
    console.log("\n[dry-run] ไม่ได้เขียนอะไรลงฐานข้อมูล");
    return;
  }

  console.log("\n=== เริ่มเขียนข้อมูล ===");
  let written = 0;
  let failed = 0;
  for (const person of prepared) {
    let state: PersonState | null = null;
    let broke = false;
    // เรียงเหมือนที่ rebuildState ทำ: ติดต่อเข้ามาก่อน แล้วที่เหลือตามเวลา
    const [creation, ...rest] = person.events;
    const ordered = [
      creation,
      ...rest.sort(
        (a, b) =>
          new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() ||
          (a.sequence ?? 0) - (b.sequence ?? 0),
      ),
    ];

    for (const event of ordered) {
      state = applyEvent(state, event);
      const { error } = await supabase.rpc("record_event", {
        p_person_id: person.personId,
        p_type: event.type,
        p_occurred_at: event.occurredAt,
        p_payload: event.payload as never,
        p_state: state as never,
      });
      if (error) {
        console.error(`  แถว ${person.rowNumber} ${person.name}: ${error.message}`);
        broke = true;
        break;
      }
    }
    // นับเฉพาะรายที่เขียนเหตุการณ์ครบ — รายที่พังกลางคันต้องไม่โผล่ในตัวเลข "สำเร็จ"
    if (broke) failed += 1;
    else written += 1;
    if ((written + failed) % 200 === 0) {
      console.log(`  เขียนแล้ว ${written + failed}/${prepared.length}`);
    }
  }
  console.log(`เขียนเสร็จ ${written} ราย${failed ? ` · พัง ${failed} ราย (ดู error ด้านบน)` : ""}`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
