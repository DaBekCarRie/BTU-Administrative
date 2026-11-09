-- apply_person_state() รับคอลัมน์ใหม่ทั้ง 7 ตัวของตาราง people
--
-- ตาราง people เป็น projection (ADR-0001) ฟังก์ชันนี้คือทางเดียวที่เขียนได้
-- ถ้าคอลัมน์ใหม่ไม่อยู่ในฟังก์ชันนี้ npm run db:rebuild จะล้างค่าทิ้งเงียบ ๆ
-- ซึ่งเป็นสิ่งที่ credit_balance เคยเกือบโดน (ดู 20260911211246)
--
-- ⚠️ ของชั่วคราวที่ต้องแก้ในขั้น 4
-- ตอนนี้ reducer ใน src/lib/domain/events.ts ยังไม่ผลิตค่าเจ็ดตัวนี้
-- ถ้าเขียน "x = excluded.x" ตรง ๆ ทุกครั้งที่บันทึกเหตุการณ์ใด ๆ
-- ค่าที่มีอยู่จะถูกทับด้วย null ทันที — คนที่เป็น 'นักศึกษา' จะกลายเป็น
-- 'ผู้สนใจ' แค่เพราะมีคนบันทึกโทรตาม
-- จึงใช้ coalesce(excluded.x, people.x) ไว้ก่อน แปลว่าในช่วงนี้
-- ล้างค่าเจ็ดตัวนี้กลับเป็นว่างไม่ได้
-- เมื่อขั้น 4 ทำให้ reducer ผลิตครบแล้ว ต้องเปลี่ยนกลับเป็น excluded.x ตรง ๆ
-- และเพิ่มชื่อฟิลด์ทั้งเจ็ดเข้า FIELDS ใน scripts/rebuild-people.mts
-- ไม่งั้น db:verify จะไม่เคยตรวจคอลัมน์พวกนี้เลย

create or replace function public.apply_person_state(p_id uuid, p_state jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.people_write', 'on', true);

  insert into public.people (
    id, full_name, nickname, phone, line_id, facebook_name,
    study_mode, faculty_id, program_id, prior_education,
    follow_up_status, enrollment_status, payment_status,
    enrollment_status_confirmed_at, payment_status_confirmed_at,
    next_call_at, owner_id, note, credit_balance,
    stage, conflict_ack, title, birth_date,
    address_id_card, address_shipping, source,
    first_contacted_at, last_event_at
  ) values (
    p_id,
    p_state->>'fullName',
    nullif(p_state->>'nickname', ''),
    nullif(p_state->>'phone', ''),
    nullif(p_state->>'lineId', ''),
    nullif(p_state->>'facebookName', ''),
    nullif(p_state->>'studyMode', '')::public.study_mode,
    nullif(p_state->>'facultyId', '')::uuid,
    nullif(p_state->>'programId', '')::uuid,
    nullif(p_state->>'priorEducation', '')::public.prior_education,
    (p_state->>'followUpStatus')::public.follow_up_status,
    (p_state->>'enrollmentStatus')::public.enrollment_status,
    (p_state->>'paymentStatus')::public.payment_status,
    nullif(p_state->>'enrollmentStatusConfirmedAt', '')::timestamptz,
    nullif(p_state->>'paymentStatusConfirmedAt', '')::timestamptz,
    nullif(p_state->>'nextCallAt', '')::timestamptz,
    nullif(p_state->>'ownerId', '')::uuid,
    nullif(p_state->>'note', ''),
    coalesce((p_state->>'creditBalance')::numeric, 0),
    -- คนใหม่เริ่มที่ 'ผู้สนใจ' เสมอ ขั้นเปลี่ยนได้ด้วยเหตุการณ์ 'เปลี่ยนขั้น' เท่านั้น
    coalesce(nullif(p_state->>'stage', '')::public.person_stage, 'ผู้สนใจ'),
    nullif(p_state->'conflictAck', 'null'::jsonb),
    nullif(p_state->>'title', '')::public.title_prefix,
    nullif(p_state->>'birthDate', '')::date,
    nullif(p_state->>'addressIdCard', ''),
    nullif(p_state->>'addressShipping', ''),
    nullif(p_state->>'source', '')::public.lead_source,
    (p_state->>'firstContactedAt')::timestamptz,
    (p_state->>'lastEventAt')::timestamptz
  )
  on conflict (id) do update set
    full_name         = excluded.full_name,
    nickname          = excluded.nickname,
    phone             = excluded.phone,
    line_id           = excluded.line_id,
    facebook_name     = excluded.facebook_name,
    study_mode        = excluded.study_mode,
    faculty_id        = excluded.faculty_id,
    program_id        = excluded.program_id,
    prior_education   = excluded.prior_education,
    follow_up_status  = excluded.follow_up_status,
    enrollment_status = excluded.enrollment_status,
    payment_status    = excluded.payment_status,
    enrollment_status_confirmed_at = excluded.enrollment_status_confirmed_at,
    payment_status_confirmed_at    = excluded.payment_status_confirmed_at,
    next_call_at      = excluded.next_call_at,
    owner_id          = excluded.owner_id,
    note              = excluded.note,
    credit_balance    = excluded.credit_balance,
    -- เจ็ดบรรทัดนี้เป็นของชั่วคราว ดูหมายเหตุหัวไฟล์ — ขั้น 4 เปลี่ยนเป็น excluded.x
    stage             = coalesce(nullif(p_state->>'stage', '')::public.person_stage, people.stage),
    conflict_ack      = coalesce(excluded.conflict_ack,      people.conflict_ack),
    title             = coalesce(excluded.title,             people.title),
    birth_date        = coalesce(excluded.birth_date,        people.birth_date),
    address_id_card   = coalesce(excluded.address_id_card,   people.address_id_card),
    address_shipping  = coalesce(excluded.address_shipping,  people.address_shipping),
    source            = coalesce(excluded.source,            people.source),
    first_contacted_at = excluded.first_contacted_at,
    last_event_at      = excluded.last_event_at;
end;
$$;
