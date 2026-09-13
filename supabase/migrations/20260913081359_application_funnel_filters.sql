-- ตัวกรองคณะและภาคของกรวยการรับสมัคร (ใบ 09)
--
-- กรองที่ฐานของ cohort คือตัวคน (คณะและภาคที่คนนั้นสนใจ) ไม่ใช่ที่ใบสมัคร
-- เพราะขั้นแรก "ติดต่อเข้ามา" ยังไม่มีใบสมัคร ถ้ากรองที่ใบสมัคร ขั้นแรกจะกรองไม่ได้
-- ค่าว่าง (null) = ไม่กรอง
--
-- เปลี่ยนรายการพารามิเตอร์ต้อง drop ของเดิม ไม่งั้นจะมีสองตัวซ้อนกัน
drop function if exists public.application_funnel(timestamptz, timestamptz);

create function public.application_funnel(
  p_from       timestamptz,
  p_to         timestamptz,
  p_faculty_id uuid default null,
  p_study_mode public.study_mode default null
)
returns table (
  contacted     bigint,
  interested    bigint,
  applied       bigint,
  paid          bigint,
  student_code  bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  with cohort as (
    select p.id, p.follow_up_status
    from public.people p
    where p.first_contacted_at >= p_from
      and p.first_contacted_at < p_to
      and p.first_contacted_at <= now()
      and (p_faculty_id is null or p.faculty_id = p_faculty_id)
      and (p_study_mode is null or p.study_mode = p_study_mode)
  ),
  reached as (
    select
      c.follow_up_status in ('สนใจสมัคร', 'สมัครแล้ว') as interested,
      exists (select 1 from public.applications a where a.person_id = c.id) as applied,
      exists (
        select 1 from public.applications a
        join public.payments pay on pay.application_id = a.id
        where a.person_id = c.id
      ) as paid,
      exists (
        select 1 from public.applications a
        where a.person_id = c.id and a.student_code is not null
      ) as has_code
    from cohort c
  )
  select
    count(*),
    count(*) filter (where interested or applied),
    count(*) filter (where applied),
    count(*) filter (where paid),
    count(*) filter (where has_code)
  from reached
$$;

revoke all on function public.application_funnel(timestamptz, timestamptz, uuid, public.study_mode) from public, anon;
grant execute on function public.application_funnel(timestamptz, timestamptz, uuid, public.study_mode) to authenticated;

comment on function public.application_funnel(timestamptz, timestamptz, uuid, public.study_mode) is
$$กรวยการรับสมัครแบบ cohort — คนที่ติดต่อเข้ามาครั้งแรกในช่วงเวลา ตอนนี้ไปถึงขั้นไหนแล้ว
กรองคณะและภาคที่ตัวคน (null = ไม่กรอง) · นับคนไม่ใช่ใบสมัคร · วันติดต่อในอนาคตไม่ถูกนับ
ตัวเลขเป็นภาพรวมของทีม ไม่แยกรายบุคคลของเจ้าหน้าที่ (ADR-0004)
security invoker ตามค่าเริ่มต้น — RLS ของผู้เรียกทำงานปกติ$$;
