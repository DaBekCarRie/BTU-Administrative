-- ===== ยามเฝ้าตาราง people =====
-- ADR-0001: people เป็นสถานะที่คำนวณจาก events เท่านั้น
-- ถ้ามีโค้ดไหน UPDATE ตรง ๆ ระบบจะเพี้ยนเงียบ ๆ — บังคับที่ฐานข้อมูลเลย ไม่ใช่แค่เขียนกฎไว้
create or replace function public.assert_people_write_allowed()
returns trigger
language plpgsql
set search_path = pg_temp
as $$
begin
  if coalesce(current_setting('app.people_write', true), '') <> 'on' then
    raise exception
      'ห้ามเขียนตาราง people ตรง ๆ — ต้องผ่าน record_event() หรือ rebuild_person_state() (ADR-0001)';
  end if;
  return new;
end;
$$;

create trigger people_write_guard
  before insert or update on public.people
  for each row execute function public.assert_people_write_allowed();

-- ===== แปลง jsonb ที่ TS คำนวณมาแล้ว เป็นแถวใน people =====
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
    next_call_at, owner_id, note, first_contacted_at, last_event_at
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
    first_contacted_at = excluded.first_contacted_at,
    last_event_at     = excluded.last_event_at;
end;
$$;

-- ===== ทางเดียวที่อนุญาตให้เขียนข้อมูลคน =====
-- เขียน event และอัปเดตสถานะปัจจุบันในทรานแซกชันเดียว
create or replace function public.record_event(
  p_person_id   uuid,
  p_type        public.event_type,
  p_occurred_at timestamptz,
  p_payload     jsonb,
  p_state       jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.apply_person_state(p_person_id, p_state);

  insert into public.events (person_id, type, occurred_at, recorded_by, payload)
  values (p_person_id, p_type, p_occurred_at, auth.uid(), coalesce(p_payload, '{}'::jsonb));

  return p_person_id;
end;
$$;

-- ===== เครื่องมือกู้: เขียนสถานะที่เล่นจาก events ใหม่ทับของเดิม =====
create or replace function public.rebuild_person_state(p_person_id uuid, p_state jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  perform public.apply_person_state(p_person_id, p_state);
end;
$$;

revoke all on function public.apply_person_state(uuid, jsonb) from public, anon;
grant execute on function public.record_event(uuid, public.event_type, timestamptz, jsonb, jsonb) to authenticated;
grant execute on function public.rebuild_person_state(uuid, jsonb) to authenticated;
