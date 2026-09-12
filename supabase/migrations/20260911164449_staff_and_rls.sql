-- ฟังก์ชันกลางสำหรับอัปเดต updated_at ใช้ซ้ำได้ทุกตาราง
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- เจ้าหน้าที่ผู้ใช้ระบบ ผูก 1:1 กับผู้ใช้ของ Supabase Auth
create table public.staff (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'staff' check (role in ('staff','admin')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.staff is
  'เจ้าหน้าที่ทีม LMS ที่ใช้ระบบนี้ — ดู CONTEXT.md';

-- อ่าน role ของตัวเองโดยไม่วนกลับเข้า RLS ของ staff เอง
-- ต้องเป็น security definer ไม่งั้น policy ที่เรียกฟังก์ชันนี้จะ recursive
create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.staff where id = auth.uid() and is_active
$$;

revoke all on function public.current_staff_role() from public, anon;
grant execute on function public.current_staff_role() to authenticated;

alter table public.staff enable row level security;

-- ADR-0004: เจ้าหน้าที่เห็นกันหมด ไม่กั้นตามเจ้าของเคส
-- เส้นที่ห้ามพลาดคือคนนอก (anon) ต้องไม่เห็นอะไรเลย
create policy staff_select_authenticated on public.staff
  for select to authenticated
  using (true);

create policy staff_update_self on public.staff
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_staff_role());

create policy staff_admin_all on public.staff
  for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');

create trigger staff_set_updated_at
  before update on public.staff
  for each row
  execute function public.set_updated_at();
