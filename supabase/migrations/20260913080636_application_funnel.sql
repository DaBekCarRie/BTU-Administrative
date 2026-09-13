-- กรวยการรับสมัครของกระดานภาพรวมหน้าแรก (ใบ 08)
--
-- นับแบบ cohort: ฐานคือคนที่ติดต่อเข้ามาครั้งแรกในช่วงเวลา แล้วนับว่าตอนนี้ไปถึงขั้นไหนแล้ว
-- ตอบคำถามที่ทีมตั้งไว้ว่า "จากคนที่ทักมาเดือนนี้ ไปถึงสมัครจริงกี่คน"
-- ถ้านับแต่ละขั้นจากกิจกรรมที่เกิดในเดือน ตัวเลขจะไม่เป็นกรวย (ยื่นสมัครอาจมากกว่าคนที่ทักมา)
--
-- - นับคน ไม่ใช่ใบสมัคร: สมัครสองรอบนับหนึ่ง
-- - วันติดต่อเข้ามาที่อยู่ในอนาคตไม่ถูกนับเข้าช่วงใดเลย (ข้อมูลเดิมมีวันพิมพ์ผิด)
-- - "สนใจสมัคร" รวมคนที่ไปไกลกว่านั้นแล้ว เพราะคนที่ยื่นสมัครแล้วบางคนสถานะติดตามไม่ได้ถูกอัปเดต
-- - นับในฐานข้อมูล ไม่ดึงแถวมานับ จะได้ไม่ถูกตัดเงียบเมื่อข้อมูลโต
create or replace function public.application_funnel(p_from timestamptz, p_to timestamptz)
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

revoke all on function public.application_funnel(timestamptz, timestamptz) from public, anon;
grant execute on function public.application_funnel(timestamptz, timestamptz) to authenticated;

comment on function public.application_funnel(timestamptz, timestamptz) is
$$กรวยการรับสมัครแบบ cohort — คนที่ติดต่อเข้ามาครั้งแรกในช่วงเวลา ตอนนี้ไปถึงขั้นไหนแล้ว
ตัวเลขเป็นภาพรวมของทีม ไม่แยกรายบุคคลของเจ้าหน้าที่ (ADR-0004)
security invoker ตามค่าเริ่มต้น — RLS ของผู้เรียกทำงานปกติ$$;
