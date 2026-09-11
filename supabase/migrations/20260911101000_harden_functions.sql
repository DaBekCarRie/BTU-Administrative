-- ปิด warning จาก Supabase security advisor

-- 1) ตรึง search_path ของ trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) ย้าย security definer function ออกจาก schema ที่ PostgREST เปิดให้เรียก
--    RLS policy ยังเรียกได้ แต่ผู้ใช้เรียกผ่าน /rest/v1/rpc/ ไม่ได้อีก
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.staff where id = auth.uid() and is_active
$$;

revoke all on function private.current_staff_role() from public, anon;
grant execute on function private.current_staff_role() to authenticated;

drop policy if exists staff_update_self on public.staff;
drop policy if exists staff_admin_all on public.staff;

create policy staff_update_self on public.staff
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = private.current_staff_role());

create policy staff_admin_all on public.staff
  for all to authenticated
  using (private.current_staff_role() = 'admin')
  with check (private.current_staff_role() = 'admin');

drop function if exists public.current_staff_role();
