-- คอลัมน์ใหม่ 17 ตัวใน 5 ตาราง
--
-- ของคนไปที่ people · ของแต่ละปีที่สมัครไปที่ applications
-- เส้นแบ่งนี้สำคัญ: ถ้าเก็บระดับปริญญา/แหล่งทุน/ไซส์เสื้อไว้ที่ people
-- ข้อมูลปีก่อนจะถูกทับหายทุกครั้งที่สมัครใหม่ ซึ่งเป็นปัญหาที่ Excel
-- หนีด้วยการแยกชีตตามปี (สมัครเรียน2568/2569/2570)
-- หลักฐานในไฟล์: ชีต 2570 มีคนที่จบ ป.ตรี ที่นี่แล้วสมัคร ป.โท
-- และชีต 2569 มีค่า "รอกู้ปี70" คือคนที่เปลี่ยนจากกู้เป็นชำระตรงกลางปี

-- ===== people: ของคน =====
alter table public.people
  -- ขั้นสถานะ (Q1) ตั้งผ่านเหตุการณ์ 'เปลี่ยนขั้น' เท่านั้น
  -- default 'ผู้สนใจ' ทำให้แถวเดิม 3,177 แถวมีค่าที่ใช้งานได้ทันที
  -- ส่วนการแมปให้ตรงความจริงเป็นงานของ migration backfill (ขั้น 5)
  add column if not exists stage            public.person_stage not null default 'ผู้สนใจ',
  -- ลายนิ้วมือของสภาพที่ "รับทราบว่าขั้นไม่ตรง" ไว้ (Q18)
  -- รูปแบบ { stage: text, applicationIds: text[] } เรียง sort แล้ว
  -- ป้ายกลับมาเมื่อลายนิ้วมือปัจจุบันไม่ตรงกับที่รับทราบไว้
  add column if not exists conflict_ack     jsonb,
  add column if not exists title            public.title_prefix,
  add column if not exists birth_date       date,
  add column if not exists address_id_card  text,
  add column if not exists address_shipping text,
  add column if not exists source           public.lead_source;

comment on column public.people.stage is
  'ขั้นสถานะ 2 ชั้น — เจ้าหน้าที่กดตั้งเอง ระบบไม่เปลี่ยนให้เอง (Q7) ยอมให้ขัดกับใบสมัครได้แต่ขึ้นป้ายเตือน (Q11)';
comment on column public.people.conflict_ack is
  'สภาพที่รับทราบแล้วว่าขั้นไม่ตรงกับใบสมัคร — { stage, applicationIds } ป้ายกลับมาเมื่อค่านี้ไม่ตรงกับปัจจุบัน';
comment on column public.people.birth_date is
  'ไม่เก็บอายุ — คำนวณจากวันเกิดใน @/lib/date ตามกฎเหล็กข้อ 5 ใน Excel ช่องอายุค้างอยู่ที่อายุตอนสมัคร ผิดทุกปีที่ผ่านไป';
comment on column public.people.source is
  'ช่องทางที่ติดต่อเข้ามาครั้งแรก — เหตุการณ์ ติดต่อเข้ามา มี payload.source เป็นข้อความอิสระอยู่แล้ว reducer จะตั้งค่านี้เฉพาะเมื่อตรงกับ enum';

-- ตารางผู้สนใจแยกเป็นสามแท็บตามขั้น จึงกรองด้วยคอลัมน์นี้ทุกครั้ง
create index if not exists people_stage_idx on public.people (stage);

-- ===== applications: ของแต่ละปีที่สมัคร =====
alter table public.applications
  add column if not exists degree_level  public.degree_level,
  add column if not exists funding_type  public.funding_type,
  add column if not exists shirt_size    public.shirt_size,
  add column if not exists box_set_state public.box_set_state not null default 'ยังไม่ส่ง',
  -- Excel ชีตสมัครเรียนไม่มีช่องนี้ แต่ดีไซน์หน้าศูนย์สอบต้องใช้ "ยื่นเมื่อ"
  -- และตอน import ใช้ค่าจากวันที่ออกใบเสร็จใบแรกเป็นค่าตั้งต้นได้
  add column if not exists applied_at    date;

comment on column public.applications.funding_type is
  'Excel มี 7 ค่าที่หมายถึงสองอย่าง (กยศ./กยศ/กู้ กยศ/กู้/กู้กยศ/กูู้้/ชำระตรง) — บีบเป็น enum สองค่า';

-- ===== exam_center_requests: ตามดีไซน์หน้าศูนย์สอบพิเศษ =====
alter table public.exam_center_requests
  add column if not exists province     text,
  add column if not exists submitted_at date;

comment on column public.exam_center_requests.province is
  'ดีไซน์แสดงจังหวัดใต้ชื่อศูนย์สอบ · จำนวนผู้ขอร่วมศูนย์ไม่เก็บซ้ำ นับจาก count(*) group by center_name';

-- ===== documents: ดีไซน์แสดงขนาดไฟล์ในแผงขวาของโต๊ะตรวจเอกสาร =====
alter table public.documents
  add column if not exists file_size bigint check (file_size is null or file_size >= 0);

-- ===== document_access_log: ดีไซน์เพิ่มตัวกรองและสองคอลัมน์ =====
-- ของเดิมมีแค่ what ซึ่งเป็นข้อความรวม กรองตามชนิดข้อมูลไม่ได้
alter table public.document_access_log
  add column if not exists kind   text,
  add column if not exists source text;

comment on column public.document_access_log.kind is
  'ชนิดข้อมูลอ่อนไหวที่เปิดดู — เลขบัตรประชาชน / สำเนาบัตรประชาชน / สำเนาทะเบียนบ้าน / ส่งออกรายชื่อ';
comment on column public.document_access_log.source is
  'เปิดจากหน้าไหน — ใช้ตอบว่าร่องรอยมาจากหน้าแฟ้ม โต๊ะตรวจเอกสาร หรือการส่งออก';

create index if not exists document_access_log_kind_idx
  on public.document_access_log (kind, viewed_at desc);
