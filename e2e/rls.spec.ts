import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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
