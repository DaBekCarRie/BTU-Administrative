-- ข้อมูลหลัก: คณะและสาขา
-- ทุกที่ในระบบต้องอ้าง FK มาที่นี่ ห้ามพิมพ์ชื่อคณะ/สาขาเป็นข้อความอิสระ
-- (ระบบเดิมพิมพ์มือ ทำให้คณะ 10 คณะกลายเป็น 64 ค่า)

create table public.faculties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.faculties is 'คณะ — ดู CONTEXT.md';

create table public.programs (
  id         uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.faculties(id) on delete restrict,
  name       text not null,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (faculty_id, name)
);

comment on table public.programs is
  'สาขา — "หลักสูตร" ใน CONTEXT.md คือคณะ+สาขาคู่กัน';

create index programs_faculty_idx on public.programs (faculty_id);

alter table public.faculties enable row level security;
alter table public.programs  enable row level security;

-- เจ้าหน้าที่ทุกคนอ่านได้ (ADR-0004) คนนอกไม่เห็นอะไรเลย
create policy faculties_select on public.faculties
  for select to authenticated using (true);
create policy programs_select on public.programs
  for select to authenticated using (true);

-- แก้ข้อมูลหลักได้เฉพาะหัวหน้าทีม
create policy faculties_admin_write on public.faculties
  for all to authenticated
  using (private.current_staff_role() = 'admin')
  with check (private.current_staff_role() = 'admin');
create policy programs_admin_write on public.programs
  for all to authenticated
  using (private.current_staff_role() = 'admin')
  with check (private.current_staff_role() = 'admin');

create trigger faculties_set_updated_at
  before update on public.faculties
  for each row execute function public.set_updated_at();
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();
