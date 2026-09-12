-- รวมสองรายการที่เป็นคนเดียวกัน (ใบ 07)
--
-- ข้อมูลเดิมมีคนเดียวกันถูกบันทึกซ้ำหลายแถว เพราะโทรเข้ามาคนละครั้งแล้วคนละคนรับ
-- ต้องรวมได้โดยไม่ทำให้ประวัติหาย — เหตุการณ์ทั้งหมดย้ายไปอยู่กับรายการที่เหลือรอด
--
-- security definer จำเป็นเพราะตาราง events ตั้งใจให้แก้ไม่ได้ (มีแค่ policy select/insert)
-- การย้ายเจ้าของเหตุการณ์เป็นข้อยกเว้นเดียวที่อนุญาต และทำได้ทางฟังก์ชันนี้ทางเดียว
create or replace function public.merge_people(
  p_survivor_id uuid,
  p_merged_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;
  if private.current_staff_role() <> 'admin' then
    raise exception 'รวมข้อมูลได้เฉพาะหัวหน้าทีม';
  end if;
  if p_survivor_id = p_merged_id then
    raise exception 'รวมรายการเข้ากับตัวเองไม่ได้';
  end if;
  if not exists (select 1 from public.people where id = p_survivor_id)
     or not exists (select 1 from public.people where id = p_merged_id) then
    raise exception 'ไม่พบรายการที่จะรวม';
  end if;

  update public.events               set person_id = p_survivor_id where person_id = p_merged_id;
  update public.applications         set person_id = p_survivor_id where person_id = p_merged_id;
  update public.exam_center_requests set person_id = p_survivor_id where person_id = p_merged_id;

  -- เอกสารมี unique (คน, ประเภท) ย้ายเฉพาะประเภทที่ปลายทางยังไม่มี
  update public.documents d
  set person_id = p_survivor_id
  where d.person_id = p_merged_id
    and not exists (
      select 1 from public.documents x
      where x.person_id = p_survivor_id and x.doc_type = d.doc_type
    );

  insert into public.merged_people (merged_id, survivor_id, merged_by)
  values (p_merged_id, p_survivor_id, actor);

  insert into public.events (person_id, type, occurred_at, recorded_by, payload)
  values (
    p_survivor_id, 'รวมข้อมูล', now(), actor,
    jsonb_build_object('mergedId', p_merged_id::text)
  );

  delete from public.people where id = p_merged_id;
end;
$$;

revoke all on function public.merge_people(uuid, uuid) from public, anon;
grant execute on function public.merge_people(uuid, uuid) to authenticated;
