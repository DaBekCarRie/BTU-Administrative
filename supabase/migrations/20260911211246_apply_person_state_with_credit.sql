-- เพิ่ม credit_balance เข้าไปในสถานะที่ projection เขียน
-- ถ้าไม่เพิ่ม ยอดเครดิตจะไม่ถูกเขียนลงตาราง และการ rebuild จะรีเซ็ตเป็น 0 เงียบ ๆ
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
    first_contacted_at = excluded.first_contacted_at,
    last_event_at     = excluded.last_event_at;
end;
$$;
