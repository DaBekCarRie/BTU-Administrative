import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hasCredentials, signedInClient } from "./identities";

/**
 * spec: "RLS: ผู้ใช้ที่ยังไม่ล็อกอินเรียก API ตรง ๆ ต้องไม่ได้ข้อมูลเลย — เส้นที่ห้ามพลาด"
 *
 * เทสต์ redirect ในหน้าเว็บพิสูจน์แค่ middleware ไม่ได้พิสูจน์ RLS
 * ไฟล์นี้ยิงตรงเข้า PostgREST ด้วย anon key เหมือนคนที่ได้ key ไปจาก bundle ของหน้าเว็บ
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.describe("RLS — ยังไม่ล็อกอินต้องไม่ได้อะไรเลย", () => {
  test.skip(!url || !anonKey, "ต้องมี NEXT_PUBLIC_SUPABASE_URL และ ANON_KEY ใน .env.local");

  const anon = () =>
    createClient(url!, anonKey!, { auth: { persistSession: false } });

  for (const table of [
    "people",
    "events",
    "documents",
    "document_access_log",
    "applications",
    "payments",
    "staff",
    "answers",
    "exam_center_requests",
    "merged_people",
    "reference_documents",
    "reference_document_files",
  ] as const) {
    test(`ตาราง ${table} คืนว่างเปล่า`, async () => {
      const { data, error } = await anon().from(table).select("*").limit(1);
      // RLS ของ Postgres ไม่ error แต่กรองจนเหลือศูนย์แถว — ทั้งสองแบบยอมรับได้
      expect(error ?? null).toBeNull();
      expect(data).toEqual([]);
    });
  }

  test("view คิวโทรคืนว่างเปล่า", async () => {
    const { data } = await anon().from("people_with_call_summary").select("id").limit(1);
    expect(data).toEqual([]);
  });

  test("ฟังก์ชันอ่านเลขบัตรประชาชนถูกปฏิเสธ", async () => {
    const { error } = await anon().rpc("read_national_id", {
      p_person_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(error).not.toBeNull();
  });

  test("เขียนเหตุการณ์ตรง ๆ ถูกปฏิเสธ", async () => {
    const { error } = await anon().rpc("record_event", {
      p_person_id: "00000000-0000-0000-0000-000000000000",
      p_type: "ติดต่อเข้ามา",
      p_occurred_at: new Date().toISOString(),
      p_payload: {},
      p_state: {},
    });
    expect(error).not.toBeNull();
  });

  test("bucket เอกสารอ้างอิงเปิดรายการไฟล์ไม่ได้", async () => {
    const { data, error } = await anon().storage.from("reference").list();
    expect(error ?? (data ?? []).length === 0).toBeTruthy();
  });

  test("bucket เอกสารเปิดรายการไฟล์ไม่ได้", async () => {
    const { data, error } = await anon().storage.from("documents").list();
    // Supabase คืน [] หรือ error แล้วแต่เวอร์ชัน — ที่ห้ามคือมีชื่อไฟล์หลุดออกมา
    expect(error ?? (data ?? []).length === 0).toBeTruthy();
  });
});

/**
 * ADR-0005: ล็อกอินได้ไม่ได้แปลว่าเป็นเจ้าหน้าที่ — ใครก็สมัครผ่าน Google ได้
 * เคยพิสูจน์บนฐานข้อมูลจริงว่าบัญชีที่ไม่มีแถวเจ้าหน้าที่อ่านคนได้หลายพันราย
 * ไฟล์นี้ยิงตรงเข้า PostgREST ด้วย token ของบัญชีคนนอกทีม ไม่ผ่านแอปเลย
 */
test.describe("RLS — ล็อกอินแล้วแต่ไม่ใช่เจ้าหน้าที่ต้องไม่ได้อะไรเลย", () => {
  // ล็อกอินครั้งเดียวทั้งกลุ่ม ไม่งั้นแต่ละเทสต์ล็อกอินเองจนชน rate limit
  test.describe.configure({ mode: "serial" });
  test.skip(!hasCredentials("outsider"), "รัน npm run e2e:accounts ก่อน");

  let outsider: SupabaseClient;
  test.beforeAll(async () => {
    outsider = await signedInClient("outsider");
  });

  for (const table of [
    "people",
    "events",
    "documents",
    "document_access_log",
    "applications",
    "payments",
    "staff",
    "answers",
    "exam_center_requests",
    "merged_people",
    "faculties",
    "programs",
    "reference_documents",
    "reference_document_files",
  ] as const) {
    test(`ตาราง ${table} คืนว่างเปล่า`, async () => {
      const { data, error } = await outsider.from(table).select("*").limit(1);
      expect(error ?? null).toBeNull();
      expect(data).toEqual([]);
    });
  }

  test("view คิวโทรคืนว่างเปล่า", async () => {
    const { data } = await outsider.from("people_with_call_summary").select("id").limit(1);
    expect(data).toEqual([]);
  });

  test("เขียนตารางไม่ได้", async () => {
    const { error } = await outsider.from("answers").insert({ question: "probe", answer: "probe" });
    expect(error).not.toBeNull();
  });

  test("ฟังก์ชันที่เขียนหรือถอดรหัสข้อมูลคนถูกปฏิเสธ", async () => {
    const nobody = "00000000-0000-0000-0000-000000000000";
    const writes = await Promise.all([
      outsider.rpc("record_event", {
        p_person_id: nobody,
        p_type: "ติดต่อเข้ามา",
        p_occurred_at: new Date().toISOString(),
        p_payload: {},
        p_state: {},
      }),
      outsider.rpc("read_national_id", { p_person_id: nobody }),
      outsider.rpc("set_national_id", { p_person_id: nobody, p_national_id: "1234567890123" }),
      outsider.rpc("merge_people", { p_survivor_id: nobody, p_merged_id: nobody, p_details: {} }),
      outsider.rpc("rebuild_person_state", { p_person_id: nobody, p_state: { fullName: "probe" } }),
    ]);
    for (const { error } of writes) expect(error).not.toBeNull();
  });

  test("ฟังก์ชันนับตัวเลขคืนศูนย์ ไม่รั่วจำนวนคนออกมา", async () => {
    const { data: queue } = await outsider.rpc("document_desk_queue", { p_limit: 10 });
    expect(queue ?? []).toEqual([]);

    const { data: funnel } = await outsider
      .rpc("application_funnel", { p_from: "2000-01-01T00:00:00Z", p_to: "2100-01-01T00:00:00Z" })
      .single();
    expect(Object.values(funnel ?? {}).every((n) => Number(n) === 0)).toBe(true);

    const { data: board } = await outsider
      .rpc("work_board_counts", {
        p_stale_days: 0,
        p_awaiting_days: 0,
        p_doc_types: 4,
        p_closed_statuses: [],
      })
      .single();
    expect(Object.values(board ?? {}).every((n) => Number(n) === 0)).toBe(true);
  });

  test("bucket ทั้งสองเปิดรายการไฟล์ไม่ได้", async () => {
    for (const bucket of ["documents", "reference"]) {
      const { data, error } = await outsider.storage.from(bucket).list();
      expect(error ?? (data ?? []).length === 0).toBeTruthy();
    }
  });
});
