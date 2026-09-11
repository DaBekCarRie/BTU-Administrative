/**
 * สร้างสถานะปัจจุบัน (ตาราง people) ใหม่จากเหตุการณ์ทั้งหมด
 *
 *   node scripts/rebuild-people.ts --check    เทียบอย่างเดียว ไม่เขียน
 *   node scripts/rebuild-people.ts            เขียนทับด้วยค่าที่เล่นใหม่
 *
 * เป็นทั้งเครื่องมือกู้ข้อมูล และเครื่องพิสูจน์ว่า projection ถูกต้อง (ADR-0001)
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

import { rebuildState, type DomainEvent, type PersonState } from "../src/lib/domain/events.ts";
import { toDomainEvent } from "../src/lib/domain/from-db.ts";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const checkOnly = process.argv.includes("--check");

async function makeClient() {
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  // ยังไม่ได้ตั้ง service role key — ใช้บัญชีสำหรับพัฒนาแทน
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: process.env.E2E_EMAIL!,
    password: process.env.E2E_PASSWORD!,
  });
  if (error) throw new Error(`ล็อกอินไม่สำเร็จ: ${error.message}`);
  console.warn("⚠️  ยังไม่ได้ตั้ง SUPABASE_SERVICE_ROLE_KEY — ใช้บัญชีพัฒนาแทน");
  return client;
}

function normalise(state: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(state).sort()) {
    const value = state[key];
    out[key] =
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
        ? new Date(value).toISOString()
        : (value ?? null);
  }
  return out;
}

const FIELDS = [
  "fullName", "nickname", "phone", "lineId", "facebookName",
  "studyMode", "facultyId", "programId", "priorEducation", "ownerId", "note",
  "followUpStatus", "enrollmentStatus", "paymentStatus",
  "enrollmentStatusConfirmedAt", "paymentStatusConfirmedAt",
  "nextCallAt", "firstContactedAt", "lastEventAt",
] as const;

function fromRow(row: Record<string, unknown>): PersonState {
  return {
    fullName: row.full_name as string,
    nickname: (row.nickname ?? null) as string | null,
    phone: (row.phone ?? null) as string | null,
    lineId: (row.line_id ?? null) as string | null,
    facebookName: (row.facebook_name ?? null) as string | null,
    studyMode: (row.study_mode ?? null) as PersonState["studyMode"],
    facultyId: (row.faculty_id ?? null) as string | null,
    programId: (row.program_id ?? null) as string | null,
    priorEducation: (row.prior_education ?? null) as PersonState["priorEducation"],
    ownerId: (row.owner_id ?? null) as string | null,
    note: (row.note ?? null) as string | null,
    followUpStatus: row.follow_up_status as PersonState["followUpStatus"],
    enrollmentStatus: row.enrollment_status as PersonState["enrollmentStatus"],
    paymentStatus: row.payment_status as PersonState["paymentStatus"],
    enrollmentStatusConfirmedAt: (row.enrollment_status_confirmed_at ?? null) as string | null,
    paymentStatusConfirmedAt: (row.payment_status_confirmed_at ?? null) as string | null,
    nextCallAt: (row.next_call_at ?? null) as string | null,
    firstContactedAt: row.first_contacted_at as string,
    lastEventAt: row.last_event_at as string,
  };
}

async function main() {
  const supabase = await makeClient();

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, person_id, type, occurred_at, payload")
    .order("person_id")
    .order("occurred_at")
    .order("id");
  if (eventsError) throw new Error(eventsError.message);

  const { data: rows, error: peopleError } = await supabase
    .from("people")
    .select("*");
  if (peopleError) throw new Error(peopleError.message);

  const byPerson = new Map<string, DomainEvent[]>();
  let skipped = 0;
  for (const raw of events ?? []) {
    const event = toDomainEvent(raw);
    if (!event) {
      skipped += 1;
      continue;
    }
    const list = byPerson.get(raw.person_id) ?? [];
    list.push(event);
    byPerson.set(raw.person_id, list);
  }

  const stored = new Map(
    (rows ?? []).map((row) => [row.id as string, fromRow(row)]),
  );

  let same = 0;
  const different: string[] = [];

  for (const [personId, personEvents] of byPerson) {
    const rebuilt = rebuildState(personEvents);
    const current = stored.get(personId);

    const matches =
      current &&
      FIELDS.every(
        (field) =>
          JSON.stringify(normalise({ [field]: rebuilt[field] })) ===
          JSON.stringify(normalise({ [field]: current[field] })),
      );

    if (matches) {
      same += 1;
      continue;
    }

    different.push(personId);
    if (!checkOnly) {
      const { error } = await supabase.rpc("rebuild_person_state", {
        p_person_id: personId,
        p_state: rebuilt as never,
      });
      if (error) throw new Error(`เขียนสถานะใหม่ไม่สำเร็จ: ${error.message}`);
    }
  }

  console.log(`คน            ${byPerson.size} ราย`);
  console.log(`เหตุการณ์      ${(events ?? []).length} รายการ (ข้ามชนิดที่โดเมนยังไม่รองรับ ${skipped})`);
  console.log(`ตรงกันอยู่แล้ว ${same} ราย`);
  console.log(
    different.length === 0
      ? "ไม่ต่างกันเลย ✓ สถานะปัจจุบันสร้างใหม่จากเหตุการณ์ได้ผลเท่าเดิมทุกแถว"
      : `${checkOnly ? "ต่างกัน" : "เขียนใหม่แล้ว"} ${different.length} ราย`,
  );

  if (checkOnly && different.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
