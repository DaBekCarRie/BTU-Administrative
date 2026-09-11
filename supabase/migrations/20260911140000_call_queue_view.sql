-- มุมมองสำหรับคิวโทร: คน + สรุปการโทรที่ผ่านมา
-- security_invoker = true สำคัญมาก ไม่งั้น view จะข้าม RLS ของตารางข้างใต้
create view public.people_with_call_summary
with (security_invoker = true) as
select
  p.*,
  (
    select count(*)
    from public.events e
    where e.person_id = p.id and e.type = 'โทรตาม'
  ) as call_count,
  (
    select e.payload->>'outcome'
    from public.events e
    where e.person_id = p.id and e.type = 'โทรตาม'
    order by e.occurred_at desc, e.id desc
    limit 1
  ) as last_call_outcome,
  (
    select e.payload->>'note'
    from public.events e
    where e.person_id = p.id and e.type = 'โทรตาม'
    order by e.occurred_at desc, e.id desc
    limit 1
  ) as last_call_note,
  (
    select e.occurred_at
    from public.events e
    where e.person_id = p.id and e.type = 'โทรตาม'
    order by e.occurred_at desc, e.id desc
    limit 1
  ) as last_call_at
from public.people p;

comment on view public.people_with_call_summary is
  'คนพร้อมสรุปการโทร สำหรับหน้าคิวโทรวันนี้';
