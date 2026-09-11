import "server-only";

import {
  applyEvent,
  type DomainEvent,
  type PersonState,
} from "@/lib/domain/events";
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
  lastEventAt: string;
};

/** รายชื่อผู้สนใจ — การค้นหาและตัวกรองเป็นเรื่องของใบ 04 */
export async function listPeople(limit = 50): Promise<PersonListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("people")
    .select(
      `id, full_name, phone, facebook_name, study_mode, follow_up_status, last_event_at,
       faculties ( name ), programs ( name ), staff ( display_name )`,
    )
    .order("last_event_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`อ่านรายชื่อไม่สำเร็จ: ${error.message}`);

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
    lastEventAt: row.last_event_at,
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
