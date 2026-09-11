import "server-only";

import {
  applyEvent,
  rebuildState,
  type DomainEvent,
  type PersonState,
} from "@/lib/domain/events";
import { toDomainEvent } from "@/lib/domain/from-db";
import { normalizePhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type PeopleRow = Tables<"people">;

/** แถวในฐานข้อมูล → สถานะในรูปที่โมดูลโดเมนเข้าใจ */
function toState(row: PeopleRow): PersonState {
  return {
    fullName: row.full_name,
    nickname: row.nickname,
    phone: row.phone,
    lineId: row.line_id,
    facebookName: row.facebook_name,
    studyMode: row.study_mode,
    facultyId: row.faculty_id,
    programId: row.program_id,
    priorEducation: row.prior_education,
    ownerId: row.owner_id,
    note: row.note,
    followUpStatus: row.follow_up_status,
    enrollmentStatus: row.enrollment_status,
    paymentStatus: row.payment_status,
    enrollmentStatusConfirmedAt: row.enrollment_status_confirmed_at,
    paymentStatusConfirmedAt: row.payment_status_confirmed_at,
    nextCallAt: row.next_call_at,
    creditBalance: Number(row.credit_balance ?? 0),
    firstContactedAt: row.first_contacted_at,
    lastEventAt: row.last_event_at,
  };
}

/**
 * ทางเดียวที่อนุญาตให้เขียนข้อมูลคน (ADR-0001)
 *
 * คำนวณสถานะใหม่ด้วยฟังก์ชันบริสุทธิ์ แล้วให้ฐานข้อมูลเขียน `events`
 * กับ `people` ในทรานแซกชันเดียว — ตาราง `people` มี trigger กันการเขียนตรง ๆ อยู่
 */
export async function recordEvent(
  personId: string,
  event: DomainEvent,
): Promise<string> {
  const supabase = await createClient();

  const { data: existing, error: readError } = await supabase
    .from("people")
    .select("*")
    .eq("id", personId)
    .maybeSingle();

  if (readError) {
    throw new Error(`อ่านข้อมูลคนไม่สำเร็จ: ${readError.message}`);
  }

  const nextState = applyEvent(existing ? toState(existing) : null, event);

  const { error } = await supabase.rpc("record_event", {
    p_person_id: personId,
    p_type: event.type,
    p_occurred_at: event.occurredAt,
    p_payload: event.payload as never,
    p_state: nextState as never,
  });

  if (error) {
    throw new Error(`บันทึกเหตุการณ์ไม่สำเร็จ: ${error.message}`);
  }

  return personId;
}

import {
  PAGE_SIZE,
  type PeopleFilters,
} from "./people-filters";

export type PersonListItem = {
  id: string;
  fullName: string;
  phone: string | null;
  facebookName: string | null;
  facultyName: string | null;
  programName: string | null;
  studyMode: string | null;
  followUpStatus: string;
  ownerName: string | null;
  /**
   * เวลาที่บันทึกล่าสุด ไม่ใช่เวลาที่เหตุการณ์เกิด
   * ใช้อันนี้เรียงลำดับ เพราะเหตุการณ์ตั้งวันล่วงหน้าได้ ถ้าเรียงตามเวลาเกิด
   * รายการที่นัดไว้เดือนหน้าจะลอยขึ้นเหนือสิ่งที่เพิ่งทำวันนี้
   */
  updatedAt: string;
};

const LIST_COLUMNS = `id, full_name, phone, facebook_name, study_mode, follow_up_status, updated_at,
   faculties ( name ), programs ( name ), staff ( display_name )`;

/**
 * ค้นด้วยชื่อไทย ชื่อ Facebook หรือเบอร์ โดยพิมพ์ไม่ครบก็เจอ
 * ใช้ ilike ที่วิ่งบน trigram index — ห้ามเปลี่ยนไปใช้ full-text search
 * เพราะ Postgres ตัดคำไทยไม่ได้ ("ศิริ" จะไม่เจอ "ศิริพร")
 */
function escapeLike(term: string): string {
  return term.replace(/[%_\\]/g, (match) => `\\${match}`);
}

function applyFilters<T extends { or: unknown; eq: unknown }>(
  query: T,
  filters: PeopleFilters,
): T {
  let next = query as unknown as {
    or: (f: string) => typeof next;
    eq: (c: string, v: string) => typeof next;
  };

  if (filters.q) {
    const term = escapeLike(filters.q);
    next = next.or(
      `full_name.ilike.%${term}%,facebook_name.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }
  if (filters.status) next = next.eq("follow_up_status", filters.status);
  if (filters.facultyId) next = next.eq("faculty_id", filters.facultyId);
  if (filters.studyMode) next = next.eq("study_mode", filters.studyMode);
  if (filters.ownerId) next = next.eq("owner_id", filters.ownerId);

  return next as unknown as T;
}

export type PeopleListResult = {
  items: PersonListItem[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * รายชื่อผู้สนใจ — กรอง เรียง และแบ่งหน้าที่ฝั่งเซิร์ฟเวอร์ทั้งหมด
 * ห้ามดึงทุกแถวมากรองในเบราว์เซอร์ ข้อมูลจริงมี 3,180 ราย
 */
export async function listPeople(
  filters: PeopleFilters,
): Promise<PeopleListResult> {
  const supabase = await createClient();

  const from = (filters.page - 1) * PAGE_SIZE;

  const query = applyFilters(
    supabase.from("people").select(LIST_COLUMNS, { count: "exact" }),
    filters,
  )
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(`อ่านรายชื่อไม่สำเร็จ: ${error.message}`);

  const total = count ?? 0;
  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: (data ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      facebookName: row.facebook_name,
      facultyName: row.faculties?.name ?? null,
      programName: row.programs?.name ?? null,
      studyMode: row.study_mode,
      followUpStatus: row.follow_up_status,
      ownerName: row.staff?.display_name ?? null,
      updatedAt: row.updated_at,
    })),
  };
}

/** ผลลัพธ์ที่กรองอยู่ทั้งหมดสำหรับส่งออกไฟล์ — ไม่แบ่งหน้า */
export async function listPeopleForExport(
  filters: PeopleFilters,
  limit = 5000,
): Promise<PersonListItem[]> {
  const supabase = await createClient();

  const { data, error } = await applyFilters(
    supabase.from("people").select(LIST_COLUMNS),
    filters,
  )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`ส่งออกไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    facebookName: row.facebook_name,
    facultyName: row.faculties?.name ?? null,
    programName: row.programs?.name ?? null,
    studyMode: row.study_mode,
    followUpStatus: row.follow_up_status,
    ownerName: row.staff?.display_name ?? null,
    updatedAt: row.updated_at,
  }));
}

/** รายชื่อเจ้าหน้าที่สำหรับ dropdown ผู้ดูแล */
export async function listStaffOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, display_name")
    .eq("is_active", true)
    .order("display_name");

  if (error) throw new Error(`อ่านรายชื่อเจ้าหน้าที่ไม่สำเร็จ: ${error.message}`);
  return data ?? [];
}

/** ข้อมูลคนหนึ่งรายสำหรับเติมลงฟอร์มแก้ไข */
export async function getPersonForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select(
      "id, full_name, nickname, phone, line_id, facebook_name, faculty_id, program_id, study_mode, prior_education, owner_id, note",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`อ่านข้อมูลคนไม่สำเร็จ: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    nickname: data.nickname,
    phone: data.phone,
    lineId: data.line_id,
    facebookName: data.facebook_name,
    facultyId: data.faculty_id,
    programId: data.program_id,
    studyMode: data.study_mode as string | null,
    priorEducation: data.prior_education as string | null,
    ownerId: data.owner_id,
    note: data.note,
  };
}

export type TimelineEntry = {
  id: number;
  type: string;
  occurredAt: string;
  recordedAt: string;
  recordedBy: string | null;
  payload: Record<string, unknown>;
};

/** ประวัติทั้งหมดของคนหนึ่ง เรียงใหม่ไปเก่าตามเวลาที่เกิดจริง ไม่จำกัดจำนวน */
export async function listTimeline(personId: string): Promise<TimelineEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, type, occurred_at, recorded_at, payload, staff ( display_name )")
    .eq("person_id", personId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw new Error(`อ่านประวัติไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    occurredAt: row.occurred_at,
    recordedAt: row.recorded_at,
    recordedBy: row.staff?.display_name ?? null,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  }));
}

/** ข้อมูลหัวเรื่องของหน้ารายละเอียด */
export async function getPersonDetail(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("people")
    .select(
      `id, full_name, nickname, phone, line_id, facebook_name, study_mode,
       prior_education, follow_up_status, enrollment_status, payment_status,
       national_id_last4, credit_balance,
       enrollment_status_confirmed_at, payment_status_confirmed_at,
       next_call_at, note, first_contacted_at,
       faculties ( name ), programs ( name ), staff ( display_name )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`อ่านข้อมูลคนไม่สำเร็จ: ${error.message}`);
  return data;
}

export type DuplicateMatch = { id: string; fullName: string; phone: string | null };

/** หาคนที่ใช้เบอร์นี้อยู่แล้ว — เตือนให้คนตัดสิน ไม่ได้บล็อก */
export async function findByPhone(
  phone: string,
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];

  const supabase = await createClient();
  let query = supabase
    .from("people")
    .select("id, full_name, phone")
    .eq("phone", normalized)
    .limit(5);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw new Error(`ตรวจเบอร์ซ้ำไม่สำเร็จ: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
  }));
}

/**
 * รวมสองรายการที่เป็นคนเดียวกัน
 * ฐานข้อมูลย้ายเหตุการณ์ให้ แล้วเราคำนวณสถานะใหม่ด้วย projection ฝั่ง TS (ADR-0001)
 */
export async function mergePeople(
  survivorId: string,
  mergedId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: survivor, error: readError } = await supabase
    .from("people")
    .select("*")
    .eq("id", survivorId)
    .maybeSingle();
  if (readError) throw new Error(`อ่านข้อมูลคนไม่สำเร็จ: ${readError.message}`);
  if (!survivor) throw new Error("ไม่พบรายการที่จะเก็บไว้");

  const { error } = await supabase.rpc("merge_people", {
    p_survivor_id: survivorId,
    p_merged_id: mergedId,
    p_details: toState(survivor) as never,
  });
  if (error) throw new Error(`รวมข้อมูลไม่สำเร็จ: ${error.message}`);

  await rebuildPersonState(survivorId);
}

/** เล่นเหตุการณ์ทั้งหมดของคนหนึ่งใหม่ แล้วเขียนสถานะปัจจุบันทับ */
export async function rebuildPersonState(personId: string): Promise<void> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, type, occurred_at, payload")
    .eq("person_id", personId)
    .order("occurred_at")
    .order("id");
  if (error) throw new Error(`อ่านเหตุการณ์ไม่สำเร็จ: ${error.message}`);

  const events = (data ?? [])
    .map(toDomainEvent)
    .filter((event): event is DomainEvent => event !== null);

  if (events.length === 0) return;

  const { error: writeError } = await supabase.rpc("rebuild_person_state", {
    p_person_id: personId,
    p_state: rebuildState(events) as never,
  });
  if (writeError) {
    throw new Error(`เขียนสถานะใหม่ไม่สำเร็จ: ${writeError.message}`);
  }
}
