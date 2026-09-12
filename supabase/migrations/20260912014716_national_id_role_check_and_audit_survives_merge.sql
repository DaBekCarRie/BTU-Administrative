-- ปิดช่องโหว่สองจุดที่ /code-review เจอ
--
-- 1) อ่าน/เขียนเลขบัตรประชาชนเช็คแค่ "ล็อกอินหรือยัง" ไม่ได้เช็คว่าเป็นเจ้าหน้าที่ที่ยังใช้งานอยู่
--    CLAUDE.md เขียนไว้เองว่า "ถอดรหัสผ่าน function security definer ที่เช็ค role"
--    ผลคือปิดการใช้งานเจ้าหน้าที่ (is_active = false) ไม่ได้ตัดสิทธิ์เขาจากการอ่านเลขบัตร
--    ซ้ำร้าย current_staff_id() จะคืน null ทำให้แถวใน document_access_log ไม่รู้ว่าใครเปิดดู
--    คือเสียทั้งด่านกันและเสียร่องรอย พร้อมกัน
--
-- 2) merge_people ลบคนที่ถูกรวมทิ้ง แล้ว document_access_log.person_id เป็น on delete cascade
--    ร่องรอยการเปิดดูเอกสารของคนนั้นจึงหายตามไปด้วย ขัดกับที่ประกาศไว้ว่า "ห้ามแก้และห้ามลบ"

-- ===== 1) ต้องเป็นเจ้าหน้าที่ที่ยังใช้งานอยู่เท่านั้น =====

create or replace function public.read_national_id(p_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := private.current_staff_id();
  result text;
begin
  if actor is null then
    raise exception 'ต้องเป็นเจ้าหน้าที่ที่ยังใช้งานอยู่';
  end if;

  select extensions.pgp_sym_decrypt(national_id_enc, private.national_id_key())
  into result
  from public.people
  where id = p_person_id and national_id_enc is not null;

  insert into public.document_access_log (person_id, what, viewed_by)
  values (p_person_id, 'เปิดดูเลขบัตรประชาชน', actor);

  return result;
end;
$$;

create or replace function public.set_national_id(
  p_person_id uuid,
  p_national_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := private.current_staff_id();
  digits text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
begin
  if actor is null then
    raise exception 'ต้องเป็นเจ้าหน้าที่ที่ยังใช้งานอยู่';
  end if;

  if digits = '' then
    perform set_config('app.people_write', 'on', true);
    update public.people
    set national_id_enc = null, national_id_last4 = null
    where id = p_person_id;

    insert into public.document_access_log (person_id, what, viewed_by)
    values (p_person_id, 'ลบเลขบัตรประชาชน', actor);
    return;
  end if;

  if length(digits) <> 13 then
    raise exception 'เลขบัตรประชาชนต้องมี 13 หลัก';
  end if;

  perform set_config('app.people_write', 'on', true);
  update public.people
  set national_id_enc   = extensions.pgp_sym_encrypt(digits, private.national_id_key()),
      national_id_last4 = right(digits, 4)
  where id = p_person_id;

  insert into public.document_access_log (person_id, what, viewed_by)
  values (p_person_id, 'บันทึกเลขบัตรประชาชน', actor);
end;
$$;

-- ===== 2) ร่องรอยการเปิดดูต้องรอดจากการรวมรายการ =====

create or replace function public.merge_people(
  p_survivor_id uuid,
  p_merged_id   uuid,
  p_details     jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := private.current_staff_id();
begin
  if actor is null then
    raise exception 'ต้องเป็นเจ้าหน้าที่ที่ยังใช้งานอยู่';
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

  -- ร่องรอยการเปิดดูต้องย้ายไปอยู่กับรายการที่เหลือรอด ไม่งั้น on delete cascade จะกลืนไป
  update public.document_access_log  set person_id = p_survivor_id where person_id = p_merged_id;

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
    jsonb_build_object('mergedId', p_merged_id::text, 'keep', coalesce(p_details, '{}'::jsonb))
  );

  delete from public.people where id = p_merged_id;
end;
$$;

comment on function public.read_national_id(uuid) is
$$ตั้งใจให้ authenticated เรียกได้ — เป็นทางเดียวที่อ่านเลขบัตรประชาชนได้
security definer จำเป็นเพราะคีย์อยู่ใน Vault ที่ authenticated เข้าไม่ถึงโดยตรง
ด่านตรวจอยู่ในตัวฟังก์ชัน: ต้องเป็นเจ้าหน้าที่ที่ยังใช้งานอยู่ (staff.is_active)
และเขียน document_access_log ทุกครั้งโดยเลี่ยงไม่ได้
ถ้าเปลี่ยนเป็น security invoker หรือ revoke execute ระบบจะอ่านเลขบัตรไม่ได้เลย$$;

comment on function public.set_national_id(uuid, text) is
$$ตั้งใจให้ authenticated เรียกได้ — เป็นทางเดียวที่บันทึกเลขบัตรประชาชนแบบเข้ารหัสได้
security definer จำเป็นเพราะต้องใช้คีย์จาก Vault และต้องข้าม trigger กันเขียน people
ด่านตรวจอยู่ในตัวฟังก์ชัน: ต้องเป็นเจ้าหน้าที่ที่ยังใช้งานอยู่ ตรวจ 13 หลัก และเขียน log ทุกครั้ง$$;
