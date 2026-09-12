-- แยก "เจ้าหน้าที่" ออกจาก "บัญชีเข้าระบบ"
--
-- เดิม staff.id = auth.users.id ทำให้สร้างเจ้าหน้าที่ที่ยังไม่มีบัญชีไม่ได้
-- แต่ข้อมูลเดิม 3,180 แถวมีชื่อผู้ดูแล 5 คนที่ต้อง map เข้ามาตอนนำเข้า
-- ถ้าไม่แยก ข้อมูลผู้ดูแลของ 2,123 แถวจะหายไปทั้งหมด

alter table public.staff drop constraint staff_id_fkey;

alter table public.staff
  add column auth_user_id uuid unique references auth.users(id) on delete set null;

update public.staff set auth_user_id = id;

comment on column public.staff.auth_user_id is
  'บัญชีเข้าระบบที่ผูกกับเจ้าหน้าที่คนนี้ — ว่างได้ สำหรับคนที่มีชื่อในข้อมูลเดิมแต่ยังไม่มีบัญชี';

create or replace function private.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.staff where auth_user_id = auth.uid() and is_active
$$;

create or replace function private.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.staff where auth_user_id = auth.uid() and is_active
$$;

revoke all on function private.current_staff_id() from public, anon;
grant execute on function private.current_staff_id() to authenticated;

drop policy if exists staff_update_self on public.staff;
create policy staff_update_self on public.staff
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid() and role = private.current_staff_role());

-- ทุกที่ที่เคยบันทึก auth.uid() ต้องบันทึก staff id แทน
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
  values (
    p_person_id, p_type, p_occurred_at,
    private.current_staff_id(),
    coalesce(p_payload, '{}'::jsonb)
  );

  return p_person_id;
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
  digits text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  if digits = '' then
    perform set_config('app.people_write', 'on', true);
    update public.people
    set national_id_enc = null, national_id_last4 = null
    where id = p_person_id;
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
  values (p_person_id, 'บันทึกเลขบัตรประชาชน', private.current_staff_id());
end;
$$;

create or replace function public.read_national_id(p_person_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result text;
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  select extensions.pgp_sym_decrypt(national_id_enc, private.national_id_key())
  into result
  from public.people
  where id = p_person_id and national_id_enc is not null;

  insert into public.document_access_log (person_id, what, viewed_by)
  values (p_person_id, 'เปิดดูเลขบัตรประชาชน', private.current_staff_id());

  return result;
end;
$$;

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
  if auth.uid() is null then
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
