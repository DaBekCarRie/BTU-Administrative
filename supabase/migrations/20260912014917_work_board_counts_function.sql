-- นับตัวเลขกระดานงานค้างในฐานข้อมูล แทนที่จะดึงแถวมานับใน TypeScript
--
-- ของเดิมมีปัญหาสามอย่าง
-- 1) "จ่ายเงินแล้วแต่ยังไม่ได้รหัสนักศึกษา" (story 52) ไม่เคยแตะตาราง payments เลย
--    แถมนับสถานะ 'รอชำระเงิน' ซึ่งแปลว่ายังไม่จ่าย เข้าไปด้วย
-- 2) "เอกสารยังไม่ครบ" (story 53) นับใบสมัคร ไม่ใช่นับคน คนเดียวสองใบถูกนับสองครั้ง
--    ทั้งที่ spec เขียนว่า "เห็นว่าใครเอกสารยังไม่ครบ"
-- 3) ดึงแถวมานับใน TypeScript แล้ว .limit(1000) ตัดเงียบ ๆ เกินพันใบก็นับขาด
--
-- เกณฑ์ยังอยู่ฝั่ง TypeScript เหมือนเดิม (THRESHOLDS) ส่งเข้ามาเป็นพารามิเตอร์
-- เพื่อให้ทีมปรับที่เดียวได้ตามที่ตั้งใจไว้แต่แรก
create or replace function public.work_board_counts(
  p_stale_days      int,
  p_awaiting_days   int,
  p_doc_types       int,
  p_closed_statuses public.follow_up_status[]
)
returns table (
  stale_leads           bigint,
  awaiting_student_code bigint,
  incomplete_documents  bigint,
  applied_this_month    bigint,
  enrolled              bigint,
  dropped               bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    (select count(*) from public.people
      where last_event_at < now() - make_interval(days => p_stale_days)
        and not (follow_up_status = any (p_closed_statuses))),

    -- ต้องมีการชำระเงินมาแล้วอย่างน้อยหนึ่งงวดจริง ๆ ถึงจะเรียกว่า "จ่ายแล้ว"
    (select count(distinct a.person_id)
       from public.applications a
      where a.student_code is null
        and a.status <> 'ยกเลิก'
        and a.updated_at < now() - make_interval(days => p_awaiting_days)
        and exists (select 1 from public.payments pay where pay.application_id = a.id)),

    -- นับ "คน" ที่ยื่นสมัครแล้วแต่เอกสารที่ตรวจผ่านยังไม่ครบทุกประเภท
    (select count(*)
       from (select distinct person_id from public.applications) p
      where (select count(*) from public.documents d
              where d.person_id = p.person_id and d.status = 'ผ่าน') < p_doc_types),

    (select count(distinct person_id) from public.applications
      where created_at >= (date_trunc('month', now() at time zone 'Asia/Bangkok')
                           at time zone 'Asia/Bangkok')),

    (select count(*) from public.people where enrollment_status = 'เรียนอยู่'),
    (select count(*) from public.people where enrollment_status = 'ดรอป')
$$;

revoke all on function public.work_board_counts(int, int, int, public.follow_up_status[]) from public, anon;
grant execute on function public.work_board_counts(int, int, int, public.follow_up_status[]) to authenticated;

comment on function public.work_board_counts(int, int, int, public.follow_up_status[]) is
$$ตัวเลขกระดานงานค้าง นับในฐานข้อมูลเพื่อไม่ให้ .limit() ตัดข้อมูลเงียบ ๆ
security invoker ตามค่าเริ่มต้น — RLS ของผู้เรียกยังทำงานปกติ
ตัวเลขทั้งหมดเป็นภาพรวมของทีม ไม่แยกรายบุคคล ตาม story 55 และ ADR-0004$$;
