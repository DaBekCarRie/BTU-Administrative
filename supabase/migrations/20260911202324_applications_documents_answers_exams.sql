-- ===== enum ที่เหลือ =====
create type public.application_status as enum (
  'ร่าง', 'รอเอกสาร', 'รอชำระเงิน', 'รอตรวจสอบ', 'อนุมัติ', 'ยกเลิก'
);
create type public.doc_type as enum (
  'รูปถ่าย', 'วุฒิการศึกษา', 'สำเนาบัตรประชาชน', 'สำเนาทะเบียนบ้าน'
);
create type public.doc_status as enum ('ส่งแล้ว', 'ผ่าน', 'ไม่ผ่าน');
create type public.answer_visibility as enum ('ตอบผู้สนใจได้', 'ใช้ภายในเท่านั้น');
create type public.exam_request_status as enum ('ขอแล้ว', 'ยืนยันแล้ว', 'ถอนแล้ว');

-- ===== การสมัคร (ใบ 10) =====
-- ปีการศึกษาเป็นช่องข้อมูล ไม่ใช่ตารางแยก — ระบบเดิมแยกชีทต่อปีแล้วคอลัมน์ไม่ตรงกัน
create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.people(id) on delete cascade,
  academic_year   int  not null,
  term            smallint,
  faculty_id      uuid references public.faculties(id) on delete restrict,
  program_id      uuid references public.programs(id) on delete restrict,
  study_mode      public.study_mode,
  prior_education public.prior_education,
  student_code    text unique,
  status          public.application_status not null default 'ร่าง',
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index applications_person_idx on public.applications (person_id);
create index applications_year_idx   on public.applications (academic_year, status);

comment on table public.applications is
  'การสมัคร — คนคนเดียวมีได้หลายรายการ (ลาออกแล้วสมัครใหม่)';

-- ===== การชำระเงิน (ใบ 10) =====
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  amount         numeric(10,2) not null check (amount > 0),
  paid_at        date not null,
  receipt_no     text,
  slip_path      text,
  note           text,
  recorded_by    uuid references public.staff(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index payments_application_idx on public.payments (application_id);

-- ===== เอกสารประจำตัว (ใบ 08) =====
-- ผูกกับ "คน" ไม่ใช่การสมัคร — คนเดิมสมัครใหม่ใช้ใบเดิมได้
create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references public.people(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  doc_type       public.doc_type not null,
  storage_path   text not null,
  status         public.doc_status not null default 'ส่งแล้ว',
  reject_reason  text,
  uploaded_by    uuid references public.staff(id) on delete set null,
  reviewed_by    uuid references public.staff(id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (person_id, doc_type)
);
create index documents_person_idx on public.documents (person_id);

-- ===== ร่องรอยการเปิดดูเอกสารอ่อนไหว (ใบ 09) =====
-- ADR-0004: ไม่กั้นสิทธิ์ แต่ทุกการเปิดดูข้อมูลอ่อนไหวต้องมีร่องรอย
create table public.document_access_log (
  id          bigint generated always as identity primary key,
  person_id   uuid not null references public.people(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  what        text not null,
  viewed_by   uuid references public.staff(id) on delete set null,
  viewed_at   timestamptz not null default now()
);
create index document_access_log_time_idx on public.document_access_log (viewed_at desc);

-- ===== คลังคำตอบ (ใบ 12) =====
create table public.answers (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  answer       text not null,
  visibility   public.answer_visibility not null default 'ตอบผู้สนใจได้',
  source       text,
  confirmed_at timestamptz,
  confirmed_by uuid references public.staff(id) on delete set null,
  view_count   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index answers_question_trgm
  on public.answers using gin (question extensions.gin_trgm_ops);

comment on column public.answers.confirmed_at is
  'ยืนยันล่าสุดเมื่อไหร่ — กฎมหาวิทยาลัยเปลี่ยนบ่อย คำตอบเก่าที่ดูน่าเชื่อถืออันตรายกว่าไม่มี';

-- ===== คำขอศูนย์สอบพิเศษ (ใบ 13) =====
create table public.exam_center_requests (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references public.people(id) on delete cascade,
  academic_year int not null,
  center_name   text not null,
  status        public.exam_request_status not null default 'ขอแล้ว',
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index exam_center_requests_year_idx
  on public.exam_center_requests (academic_year, center_name);

-- ===== บันทึกการรวมรายการซ้ำ (ใบ 07) =====
create table public.merged_people (
  merged_id   uuid primary key,
  survivor_id uuid not null references public.people(id) on delete cascade,
  merged_by   uuid references public.staff(id) on delete set null,
  merged_at   timestamptz not null default now()
);

-- ===== เพิ่มช่องในตาราง people =====
alter table public.people
  add column credit_balance     numeric(10,2) not null default 0,
  add column national_id_enc    bytea,
  add column national_id_last4  text;

comment on column public.people.credit_balance is
  'เงินที่ชำระแล้วแต่ยังไม่ถูกใช้ เกิดจากการดรอปหรือย้ายเทอม — ไม่มีการคืนเงิน';
comment on column public.people.national_id_enc is
  'เลขบัตรประชาชนเข้ารหัส ถอดได้ทางเดียวคือผ่าน read_national_id() ที่เขียน log ทุกครั้ง';

-- ===== RLS =====
alter table public.applications          enable row level security;
alter table public.payments              enable row level security;
alter table public.documents             enable row level security;
alter table public.document_access_log   enable row level security;
alter table public.answers               enable row level security;
alter table public.exam_center_requests  enable row level security;
alter table public.merged_people         enable row level security;

-- ADR-0004: เจ้าหน้าที่ทุกคนเห็นและแก้ได้ คนนอกไม่เห็นอะไรเลย
create policy applications_rw on public.applications
  for all to authenticated using (true) with check (true);
create policy payments_rw on public.payments
  for all to authenticated using (true) with check (true);
create policy documents_rw on public.documents
  for all to authenticated using (true) with check (true);
create policy answers_rw on public.answers
  for all to authenticated using (true) with check (true);
create policy exam_center_requests_rw on public.exam_center_requests
  for all to authenticated using (true) with check (true);
create policy merged_people_rw on public.merged_people
  for all to authenticated using (true) with check (true);

-- ร่องรอยการเปิดดูห้ามแก้และห้ามลบ อ่านได้เฉพาะหัวหน้าทีม
create policy document_access_log_insert on public.document_access_log
  for insert to authenticated with check (true);
create policy document_access_log_admin_read on public.document_access_log
  for select to authenticated
  using (private.current_staff_role() = 'admin');

create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
create trigger answers_set_updated_at before update on public.answers
  for each row execute function public.set_updated_at();
create trigger exam_center_requests_set_updated_at before update on public.exam_center_requests
  for each row execute function public.set_updated_at();
