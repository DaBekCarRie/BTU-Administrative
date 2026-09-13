-- คิวของโต๊ะตรวจเอกสาร (ใบ 10)
--
-- เดิมโต๊ะตรวจเลือก 100 คนที่มีเหตุการณ์ล่าสุดก่อน แล้วค่อยดูว่ามีเอกสารไหม
-- คนที่ส่งเอกสารไว้แต่ไม่มีความเคลื่อนไหวใหม่จึงหลุดจากชุดข้อมูลตั้งแต่ต้นทาง
-- วัดตอนแก้: เอกสารรอตรวจของคน 18 รายไม่โผล่บนโต๊ะเลย
--
-- ฟังก์ชันนี้เลือกจากคนที่มีเอกสารจริงเท่านั้น และเรียงของที่รอตรวจนานที่สุดขึ้นก่อน
-- ใช้ updated_at ของเอกสารที่ "ส่งแล้ว" เพราะส่งใหม่หลังถูกตีกลับจะอัปเดตแถวเดิม
-- created_at จึงเป็นเวลาส่งครั้งแรก ไม่ใช่เวลาที่เริ่มรอรอบนี้
-- คืนจำนวนคนทั้งหมดมาด้วย ให้หน้าจอบอกได้ว่ามีอีกกี่รายเมื่อถูกจำกัดจำนวน
create or replace function public.document_desk_queue(p_limit int)
returns table (person_id uuid, waiting_since timestamptz, total_people bigint)
language sql
stable
set search_path = public, pg_temp
as $$
  with per_person as (
    select d.person_id,
           min(d.updated_at) filter (where d.status = 'ส่งแล้ว') as waiting_since,
           max(d.updated_at) as last_activity
    from public.documents d
    group by d.person_id
  )
  select person_id, waiting_since, count(*) over () as total_people
  from per_person
  order by waiting_since asc nulls last, last_activity desc
  limit p_limit
$$;

revoke all on function public.document_desk_queue(int) from public, anon;
grant execute on function public.document_desk_queue(int) to authenticated;

comment on function public.document_desk_queue(int) is
$$คิวของโต๊ะตรวจเอกสาร เลือกจากคนที่มีเอกสารจริง เรียงของที่รอตรวจนานที่สุดก่อน
security invoker ตามค่าเริ่มต้น — RLS ของผู้เรียกทำงานปกติ คนนอกทีมได้ศูนย์แถว$$;
