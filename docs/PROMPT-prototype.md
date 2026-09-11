# Prompt: ระบบรับสมัครนักศึกษา (Prototype)

> วิธีใช้: วางข้อความตั้งแต่ `--- เริ่ม prompt ---` ลงไปทั้งหมด ในเครื่องมือ vibe code
> (Claude Code / Lovable / v0 / Bolt) แล้วสั่งให้เริ่มจาก Phase 1 เท่านั้น
> **อย่าสั่งให้ทำทุก Phase รวดเดียว** — ทำทีละ Phase แล้วกดดูก่อนไป Phase ถัดไป

---
--- เริ่ม prompt ---

คุณกำลังสร้างระบบรับสมัครนักศึกษาสำหรับมหาวิทยาลัย ใช้แทน Google Sheets ที่ทีมงาน
5 คนใช้อยู่ (ผู้สนใจ ~3,000 ราย/ปี) ให้ทำตาม spec นี้อย่างเคร่งครัด

## Stack (ห้ามเปลี่ยน)
- Next.js 15 App Router + TypeScript (strict) + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage + RLS)
- ภาษาไทยทั้งระบบ, timezone Asia/Bangkok, ปี พ.ศ. ในหน้าจอ / ค.ศ. ในฐานข้อมูล

## กฎเหล็ก 5 ข้อ (สำคัญที่สุด — อ่านก่อนเขียนโค้ดทุกครั้ง)
1. **Schema เป็นความจริงเพียงหนึ่งเดียว** ห้ามสร้างตาราง/คอลัมน์/enum ใหม่นอกเหนือจากที่ระบุ
   ถ้าคิดว่าจำเป็นต้องเพิ่ม ให้ถามก่อน อย่าเพิ่มเอง
2. **ห้ามมี free-text ในช่องที่เป็นประเภท** คณะ/สาขา/วุฒิ/สถานะ/แอดมิน ต้องเป็น FK หรือ enum
   เสมอ และ UI ต้องเป็น dropdown เท่านั้น (ระบบเดิมพังเพราะข้อนี้ ดูหัวข้อ "บทเรียน")
3. **วันที่ต้องเป็น date/timestamptz เท่านั้น** ห้ามเก็บวันที่เป็น text ห้ามเก็บสถานะปนใน
   ช่องวันที่
4. **หลังแก้ schema ทุกครั้ง ให้ generate TypeScript types จาก Supabase ใหม่ทันที**
   แล้วให้ทุก query อ้าง type นั้น ห้ามประกาศ type ของตารางเองซ้ำ
5. **ทำทีละ Phase** จบ Phase แล้วหยุด รายงานว่าทำอะไรไปบ้าง รอคำสั่งก่อนไปต่อ

## บทเรียนจากระบบเดิม (ต้องออกแบบให้ปัญหาเหล่านี้เกิดซ้ำไม่ได้)
วิเคราะห์จากข้อมูลจริง 3,071 แถว:
- ชื่อคณะพิมพ์มือ กลายเป็น **63 ค่าที่ต่างกัน** ทั้งที่จริงมี 10 (`บริหารธุรกิจ` 1,308 /
  `บริหารธุกิจ` 50 / `บริหารธุรกิิจ` 13 / `บริิหารธุรกิจ` 6) → **ต้องเป็น FK ไปตาราง faculties**
- ชื่อแอดมิน 5 คน กลายเป็น 16 ค่า เพราะวรรณยุกต์ซ้ำที่มองด้วยตาไม่เห็น
  (`ฝ้าย` / `ฝ้้าย` / `ฝ้้้าย` / `ฝ้้้้าย` / `ฝ้้้้้าย`) → **ต้องเป็น FK ไป auth user**
- วุฒิการศึกษา 43 ค่า (`ปวส` 281 vs `ปวส.` 231, กศน. เขียน 7 แบบ) → **ต้องเป็น enum**
- ช่อง "วันที่ให้โทร" มีทั้งวันที่และสถานะปนกัน (`สมัครแล้ว` 87, `ไม่ต้องโทร` 34)
  → **ต้องแยก `status` ออกจาก `next_call_at` เป็นคนละคอลัมน์**
- การติดตามเป็น 6 คอลัมน์ ครั้งที่ 7 ต้องเพิ่มคอลัมน์ → **ต้องเป็นตารางแยก ไม่จำกัดจำนวน**
- ชื่อซ้ำ 106 กลุ่ม เบอร์ซ้ำ 12 เบอร์ → **ต้องมี unique constraint + เตือนตอนกรอก**
- แต่ละปีการศึกษาแยกเป็นคนละชีท คอลัมน์ไม่ตรงกัน → **ต้องเป็น field `academic_year` เดียว**
- เลขบัตรประชาชนเก็บ plain text ในชีทที่แชร์ทั้งทีม → **ต้องเข้ารหัส + จำกัดสิทธิ์**

## Database Schema (สร้างเป็น Supabase migration)

```sql
-- ===== Master data (seed ไว้ล่วงหน้า ห้ามให้ผู้ใช้พิมพ์เอง) =====
create table faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table programs (            -- สาขา
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references faculties(id),
  name text not null,
  is_active boolean not null default true,
  unique (faculty_id, name)
);

-- ===== Enums =====
create type study_mode as enum ('ปกติ','สมทบ','ทางไกล');
create type degree_level as enum ('ปวช','ปวส','ปริญญาตรี','ปริญญาโท','ปริญญาเอก');
create type prior_education as enum
  ('ม.6','กศน.เทียบเท่า ม.6','ปวช.','ปวส.','ปริญญาตรี','อื่นๆ');
create type payment_type as enum ('ชำระตรง','กู้ กยศ.');
create type lead_status as enum
  ('ใหม่','กำลังติดตาม','นัดโทรแล้ว','สนใจสมัคร','สมัครแล้ว','ไม่สนใจ','ติดต่อไม่ได้');
create type application_status as enum
  ('ร่าง','รอเอกสาร','รอชำระเงิน','รอตรวจสอบ','อนุมัติ','ยกเลิก');
create type doc_type as enum
  ('รูปถ่าย','ใบสมัคร','วุฒิการศึกษา','สำเนาบัตรประชาชน','สำเนาทะเบียนบ้าน','อื่นๆ');
create type doc_status as enum ('ยังไม่ส่ง','ส่งแล้ว','ผ่าน','ไม่ผ่าน');
create type gov_loan_status as enum ('ไม่กู้','ยื่นแล้ว','สัมภาษณ์แล้ว','ผ่าน','ไม่ผ่าน');

-- ===== ผู้ใช้ระบบ =====
create table staff (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin','staff','finance','registrar')),
  is_active boolean not null default true
);

-- ===== Lead (แทนชีท "รายละเอียด") =====
create table leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text,
  phone text,                          -- normalize เป็น 10 หลักก่อนบันทึกเสมอ
  line_id text,
  facebook_name text,
  contacted_at date not null default current_date,   -- วันที่ติดต่อเข้ามา
  source text,                         -- Facebook / Line / Walk-in / แนะนำ
  study_mode study_mode,
  degree_level degree_level,
  faculty_id uuid references faculties(id),
  program_id uuid references programs(id),
  prior_education prior_education,
  payment_type payment_type,
  status lead_status not null default 'ใหม่',        -- แยกจากวันที่เด็ดขาด
  next_call_at timestamptz,            -- วัน+เวลานัดโทร (date จริง ไม่ใช่ text)
  owner_id uuid references staff(id),  -- แอดมินผู้ดูแล (FK ไม่ใช่ชื่อพิมพ์มือ)
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on leads (status, next_call_at);
create index on leads (owner_id);
create unique index leads_phone_uniq on leads (phone) where phone is not null;

-- ===== ประวัติการติดตาม (แทน 6 คอลัมน์เดิม) =====
create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  called_at timestamptz not null default now(),
  called_by uuid not null references staff(id),
  outcome text not null check (outcome in
    ('ไม่รับสาย','คุยแล้วสนใจ','คุยแล้วไม่สนใจ','ขอคิดดูก่อน','นัดโทรใหม่','สมัครแล้ว')),
  note text,
  next_call_at timestamptz
);
create index on follow_ups (lead_id, called_at desc);

-- ===== ใบสมัคร (แทนชีท 2568/2569/2570 รวมเป็นตารางเดียว) =====
create table applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),         -- null ได้ ถ้าสมัครตรงผ่านหน้าเว็บ
  academic_year int not null,                -- 2568, 2569, 2570 (พ.ศ.)
  term smallint,
  student_code text unique,                  -- รหัสนักศึกษา (ออกทีหลัง)
  title text not null,                       -- คำนำหน้า
  first_name text not null,
  last_name text not null,
  birth_date date,
  national_id_enc bytea,                     -- เข้ารหัส ห้ามเก็บ plain text
  national_id_last4 text,                    -- ไว้แสดง/ค้นหา
  address_registered text,
  address_shipping text,
  phone text not null,
  email text,
  study_mode study_mode not null,
  degree_level degree_level not null,
  faculty_id uuid not null references faculties(id),
  program_id uuid not null references programs(id),
  prior_education prior_education not null,
  payment_type payment_type not null,
  gov_loan_status gov_loan_status not null default 'ไม่กู้',
  shirt_size text check (shirt_size in ('S','M','L','XL','2XL','3XL')),
  boxset_shipped_at date,
  student_card_shipped_at date,
  status application_status not null default 'ร่าง',
  owner_id uuid references staff(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on applications (academic_year, status);

-- ===== การเงิน (หลายรายการต่อใบสมัคร แทนคอลัมน์ค่าเทอม1/2/3) =====
create table payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  term smallint,
  amount numeric(10,2) not null check (amount >= 0),
  paid_at date not null,
  receipt_no text,
  receipt_issued_at date,
  receipt_shipped_at date,
  method text,
  recorded_by uuid references staff(id),
  created_at timestamptz not null default now()
);
create index on payments (application_id);

-- ===== เอกสาร =====
create table documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  doc_type doc_type not null,
  storage_path text,                   -- Supabase Storage (private bucket)
  status doc_status not null default 'ยังไม่ส่ง',
  reviewed_by uuid references staff(id),
  reviewed_at timestamptz,
  note text,
  unique (application_id, doc_type)
);

-- ===== Audit log (PDPA) =====
create table audit_log (
  id bigserial primary key,
  actor_id uuid references staff(id),
  action text not null,                -- view_national_id / update / delete / export
  entity text not null,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);
```

## ความปลอดภัย (ต้องทำ ห้ามข้าม)
1. **เปิด RLS ทุกตาราง** ไม่มีข้อยกเว้น
2. **เลขบัตรประชาชน** เก็บเข้ารหัสด้วย `pgcrypto` (`pgp_sym_encrypt`) โดยคีย์อยู่ใน
   Supabase Vault เท่านั้น — ห้าม hardcode ห้ามใส่ใน .env ฝั่ง client
3. **การถอดรหัสเลขบัตร** ทำผ่าน Postgres function `security definer` ที่เช็ค role ว่าเป็น
   `admin` หรือ `registrar` เท่านั้น และ **เขียน audit_log ทุกครั้งที่ถอด**
4. **หน้าจอปกติแสดงแค่ 4 ตัวท้าย** (`x-xxxx-xxxxx-x4-x`) มีปุ่ม "แสดงเลขเต็ม" ที่กดแล้ว
   บันทึก log
5. **RLS policy หลัก:**
   - `staff` เห็นเฉพาะ lead ที่ `owner_id = auth.uid()` หรือที่ยังไม่มีเจ้าของ
   - `admin` / `registrar` เห็นทั้งหมด
   - `finance` เห็น applications + payments แต่ **เห็นเลขบัตรไม่ได้**
6. **Storage bucket ต้องเป็น private** เข้าถึงผ่าน signed URL อายุสั้นเท่านั้น
7. ห้ามใช้ `service_role` key ใน client component เด็ดขาด

## Phase 1 — Core (ทำก่อน แล้วหยุดรอ)
1. Supabase migration ตาม schema ข้างบน + RLS + seed คณะ/สาขา
   (seed: บริหารธุรกิจ, รัฐศาสตร์, นิติศาสตร์, ศึกษาศาสตร์, วิศวกรรมศาสตร์, บัญชี,
   ศิลปศาสตร์, สาธารณสุขศาสตร์, พยาบาลศาสตร์, บริหารการศึกษา
   — สาขายอดนิยม: การจัดการ, รัฐประศาสนศาสตร์, การจัดการโลจิสติกส์, การตลาด, การบัญชี)
2. Auth: login ด้วย email + layout หลัก + sidebar
3. หน้า `/leads` — ตารางรายชื่อผู้สนใจ: ค้นหา, กรองตามสถานะ/แอดมิน/คณะ, แบ่งหน้า
4. หน้า `/leads/[id]` — รายละเอียด + timeline การติดตาม + ปุ่ม "บันทึกผลการโทร"
   (dialog: ผลลัพธ์ + โน้ต + นัดโทรครั้งถัดไป → เขียนลง follow_ups และอัปเดต
   `leads.status` + `leads.next_call_at` ในคำสั่งเดียว)
5. หน้า `/leads/new` — ฟอร์มเพิ่ม lead (dropdown ทุกช่องประเภท, เตือนถ้าเบอร์ซ้ำ)

**เกณฑ์ผ่าน Phase 1:** เพิ่ม lead → โทร → บันทึกผล → เห็นประวัติครบ โดยไม่มีช่องไหน
ให้พิมพ์ชื่อคณะ/สาขา/วุฒิ/แอดมินเป็น text ได้เลย

## Phase 2 — Dashboard + ใบสมัคร
6. `/` Dashboard: **คิวโทรวันนี้** (`next_call_at <= now()` และ status ยังไม่จบ),
   lead ค้างเกิน 7 วัน, ยอดสมัครปีนี้, funnel ใหม่→ติดตาม→สนใจ→สมัคร
7. ปุ่ม **"แปลงเป็นใบสมัคร"** ในหน้า lead → prefill ข้อมูลทั้งหมด ไม่ต้องพิมพ์ใหม่
8. `/applications` + `/applications/[id]` — แท็บ: ข้อมูล / เอกสาร / การเงิน
9. เช็กลิสต์เอกสาร (ติ๊ก + upload ไฟล์เข้า private bucket) และบันทึกการชำระเงิน

## Phase 3 — หน้าสมัครสาธารณะ
10. `/apply` — ฟอร์มสมัครสาธารณะ ไม่ต้อง login **ทำเป็น multi-step 3 ขั้น:**
    ข้อมูลส่วนตัว → หลักสูตรที่สนใจ → อัปโหลดเอกสาร
11. ต้องมี: validation ครบ (เลขบัตร 13 หลัก + ตรวจ checksum, เบอร์ 10 หลัก),
    reCAPTCHA หรือ Cloudflare Turnstile, rate limit ต่อ IP,
    **checkbox ยินยอม PDPA พร้อมลิงก์นโยบายความเป็นส่วนตัว (บังคับติ๊ก)**
12. สมัครแล้วสร้าง `applications` status = `รอตรวจสอบ` + สร้าง `leads` อัตโนมัติ
    ถ้าเบอร์ยังไม่มีในระบบ, ถ้ามีแล้วให้ผูกกับ lead เดิม (ห้ามสร้างซ้ำ)
13. หน้า `/apply/success` แสดงเลขอ้างอิงให้ผู้สมัครเก็บไว้
14. หน้า `/applications?status=รอตรวจสอบ` ให้แอดมินตรวจและอนุมัติ

## Phase 4 — รายงาน + นำเข้าข้อมูลเก่า
15. `/reports` — conversion rate ต่อแอดมิน, ยอดสมัครต่อคณะ/สาขา, ยอดเงินรับต่อเดือน,
    เวลาเฉลี่ยจาก lead ถึงสมัคร, export Excel
16. สคริปต์นำเข้าข้อมูลเก่าจาก Google Sheets พร้อม mapping ค่าที่สะกดเพี้ยน
    (63 คณะ → 10, ลบวรรณยุกต์ซ้ำในชื่อแอดมิน, แปลงวันที่ text → date,
    แยกสถานะออกจากช่องวันที่, รวมคอลัมน์ติดตาม 6 ช่อง → แถวใน follow_ups)
    ต้องมี dry-run mode และรายงานว่าแถวไหน map ไม่ได้

## UX ที่ต้องมี
- Responsive — แอดมินใช้มือถือตอนโทร ปุ่ม "บันทึกผลการโทร" ต้องกดง่ายบนมือถือ
- เบอร์โทรเป็นลิงก์ `tel:` กดโทรได้เลย
- แสดงวันที่เป็น พ.ศ. รูปแบบไทย (เช่น 2 ก.ย. 2569)
- Toast แจ้งผลทุก action, optimistic update ในตาราง
- Empty state และ loading skeleton ทุกหน้า

--- จบ prompt ---

## คำสั่งเสริมที่ควรพิมพ์ตามหลัง

**เริ่มงาน:**
> เริ่ม Phase 1 เท่านั้น ทำ migration + seed ให้เสร็จก่อน แล้วให้ฉันดู schema ก่อนเขียน UI

**เมื่อจะไปต่อ:**
> Phase 1 ใช้ได้แล้ว ไป Phase 2 — อย่าแก้ schema เดิม ถ้าจำเป็นต้องแก้ให้ถามก่อน

**เมื่อ AI เริ่มมั่ว (สัญญาณ: สร้างตารางใหม่เอง / พิมพ์ชื่อคณะเป็น string):**
> หยุด อ่านกฎเหล็ก 5 ข้อใหม่ แล้วบอกฉันว่าเมื่อกี้ผิดข้อไหน ก่อนแก้

**หลังทำเสร็จแต่ละ Phase:**
> generate TypeScript types จาก Supabase ใหม่ แล้วรัน type-check ให้ผ่านก่อนบอกว่าเสร็จ
