-- ===== enum =====
-- เหตุการณ์ครบ 15 ชนิดตาม spec (TS จะทยอยรองรับทีละใบงาน)
create type public.event_type as enum (
  'ติดต่อเข้ามา', 'โทรตาม', 'ปิดเคส',
  'ยื่นสมัคร', 'ส่งเอกสาร', 'ตรวจเอกสาร', 'ชำระเงิน', 'ได้รหัสนักศึกษา',
  'ย้ายเทอม', 'ดรอป', 'กลับมาเรียน', 'ลาออก',
  'ขอศูนย์สอบพิเศษ', 'ถอนคำขอศูนย์สอบ',
  'แก้ไขข้อมูล'
);

-- สถานะ 3 มิติที่เปลี่ยนอิสระต่อกัน (ADR-0002) ห้ามยุบรวม
create type public.follow_up_status as enum (
  'ใหม่', 'กำลังติดตาม', 'นัดโทรแล้ว', 'สนใจสมัคร', 'สมัครแล้ว', 'ไม่สนใจ', 'ติดต่อไม่ได้'
);
create type public.enrollment_status as enum (
  'ยังไม่เริ่ม', 'เรียนอยู่', 'ดรอป', 'ลาออก', 'จบแล้ว'
);
create type public.payment_status as enum (
  'ยังไม่ชำระ', 'ผ่อนอยู่', 'รักษาสภาพ', 'ชำระครบ'
);

create type public.study_mode as enum ('ปกติ', 'สมทบ', 'ทางไกล');
create type public.prior_education as enum (
  'ม.6', 'กศน.เทียบเท่า ม.6', 'ปวช.', 'ปวส.', 'ปริญญาตรี', 'อื่นๆ'
);

-- ===== คน =====
-- สถานะปัจจุบันที่คำนวณจาก events (ADR-0001) — สร้างใหม่ได้เสมอ ไม่ใช่แหล่งความจริง
create table public.people (
  id                  uuid primary key,
  full_name           text not null,
  nickname            text,
  phone               text,
  line_id             text,
  facebook_name       text,

  study_mode          public.study_mode,
  faculty_id          uuid references public.faculties(id) on delete restrict,
  program_id          uuid references public.programs(id) on delete restrict,
  prior_education     public.prior_education,

  follow_up_status    public.follow_up_status  not null default 'ใหม่',
  enrollment_status   public.enrollment_status not null default 'ยังไม่เริ่ม',
  payment_status      public.payment_status    not null default 'ยังไม่ชำระ',

  -- ADR-0003: สองมิติหลังเป็นสำเนาจากหน่วยงานอื่น ต้องรู้ว่ายืนยันล่าสุดเมื่อไหร่
  enrollment_status_confirmed_at timestamptz,
  payment_status_confirmed_at    timestamptz,

  next_call_at        timestamptz,
  owner_id            uuid references public.staff(id) on delete set null,
  note                text,

  first_contacted_at  timestamptz not null,
  last_event_at       timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.people is
  'คน — สถานะปัจจุบันที่คำนวณจาก events สร้างใหม่ได้เสมอ ห้ามถือเป็นแหล่งความจริง';

-- ไม่ใส่ unique บนเบอร์โทรโดยตั้งใจ: บางเบอร์ใช้ร่วมกันในครอบครัวจริง
-- การกันซ้ำเป็นการ "เตือนแล้วให้คนตัดสิน" ในใบ 07 ไม่ใช่การบล็อกที่ฐานข้อมูล
create index people_phone_idx       on public.people (phone);
create index people_follow_up_idx   on public.people (follow_up_status, next_call_at);
create index people_owner_idx       on public.people (owner_id);

-- ===== เหตุการณ์ =====
-- เพิ่มอย่างเดียว ไม่ลบ ไม่แก้ (ADR-0001)
create table public.events (
  id          bigint generated always as identity primary key,
  person_id   uuid not null references public.people(id) on delete cascade,
  type        public.event_type not null,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.staff(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb
);

comment on column public.events.occurred_at is 'เวลาที่เกิดจริง — ย้อนหลังได้';
comment on column public.events.recorded_at is 'เวลาที่กดบันทึกเข้าระบบ';

create index events_person_idx on public.events (person_id, occurred_at, id);

alter table public.people enable row level security;
alter table public.events enable row level security;

-- ADR-0004: เจ้าหน้าที่เห็นและแก้ได้หมด คนนอกไม่เห็นอะไรเลย
create policy people_all_authenticated on public.people
  for all to authenticated using (true) with check (true);

-- เหตุการณ์อ่านได้ เพิ่มได้ แต่ห้ามแก้และห้ามลบ
create policy events_select on public.events
  for select to authenticated using (true);
create policy events_insert on public.events
  for insert to authenticated with check (true);

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();
