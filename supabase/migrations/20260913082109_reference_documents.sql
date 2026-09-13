-- เอกสารอ้างอิง (ใบ 06) — ของกลางที่ทีมเปิดดูเพื่ออ้างอิง ไม่ผูกกับคน ไม่มีการตรวจผ่าน/ไม่ผ่าน
--
-- อยู่นอกระบบเหตุการณ์โดยตั้งใจ (ADR-0006): ADR-0001 บังคับเฉพาะการเขียนข้อมูล "คน"
-- ตารางนี้จึงเขียนตรงได้
--
-- สิทธิ์ในใบนี้: เจ้าหน้าที่ทุกคนอ่าน เพิ่ม และแก้ได้ · ยังไม่มี policy ลบ — ใบ 07 เพิ่มให้เฉพาะหัวหน้าทีม
-- ไม่เขียนบันทึกการเปิดดู เพราะไม่ใช่ข้อมูลส่วนบุคคล

create type public.reference_category as enum (
  'ตารางสอบ',
  'ปฏิทินการศึกษา',
  'แบบฟอร์ม',
  'ประกาศ',
  'สื่อประชาสัมพันธ์',
  'อื่นๆ'
);

create table public.reference_documents (
  id            uuid primary key default gen_random_uuid(),
  category      public.reference_category not null,
  title         text not null check (length(btrim(title)) between 1 and 200),
  -- พ.ศ. แบบเดียวกับปีการศึกษาของการสมัคร — เป็นป้ายชื่อรุ่น ไม่ใช่จุดเวลา
  -- ว่างได้ เพราะรูปประชาสัมพันธ์ไม่ผูกกับปี แต่ตารางสอบผูก
  academic_year int check (academic_year between 2500 and 2700),
  uploaded_by   uuid references public.staff(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index reference_documents_category_year_idx
  on public.reference_documents (category, academic_year);

create trigger reference_documents_set_updated_at
  before update on public.reference_documents
  for each row execute function public.set_updated_at();

-- หนึ่งรายการแนบได้หลายไฟล์ เพราะตารางสอบมักมีหลายหน้าหรือหลายภาค
create table public.reference_document_files (
  id                    uuid primary key default gen_random_uuid(),
  reference_document_id uuid not null references public.reference_documents(id) on delete cascade,
  storage_path          text not null unique,
  -- ชื่อไฟล์เดิมไว้แสดง — path ใน storage ต้องเป็นอักษรอังกฤษเพราะ Supabase ไม่รับภาษาไทย
  file_name             text not null,
  mime_type             text not null,
  size_bytes            integer check (size_bytes >= 0),
  uploaded_by           uuid references public.staff(id) on delete set null,
  created_at            timestamptz not null default now()
);

create index reference_document_files_document_idx
  on public.reference_document_files (reference_document_id);

alter table public.reference_documents enable row level security;
alter table public.reference_document_files enable row level security;

create policy reference_documents_select on public.reference_documents
  for select to authenticated
  using ((select private.current_staff_id()) is not null);
create policy reference_documents_insert on public.reference_documents
  for insert to authenticated
  with check ((select private.current_staff_id()) is not null);
create policy reference_documents_update on public.reference_documents
  for update to authenticated
  using ((select private.current_staff_id()) is not null)
  with check ((select private.current_staff_id()) is not null);

create policy reference_document_files_select on public.reference_document_files
  for select to authenticated
  using ((select private.current_staff_id()) is not null);
create policy reference_document_files_insert on public.reference_document_files
  for insert to authenticated
  with check ((select private.current_staff_id()) is not null);

-- ถังแยกจากเอกสารรายคน: เขียนสิทธิ์ต่างกันได้ และสคริปต์ล้างไฟล์รายคนไม่มีทางไปโดน
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reference', 'reference', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy reference_bucket_select on storage.objects
  for select to authenticated
  using (bucket_id = 'reference' and (select private.current_staff_id()) is not null);
create policy reference_bucket_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reference' and (select private.current_staff_id()) is not null);
